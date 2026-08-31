#!/usr/bin/env node
// Deploy = build, push to main, then prove it actually reached live.
// CI (.github/workflows/deploy.yml) does the FTP upload on any push to main.
import { execSync, spawnSync } from 'node:child_process';

const LIVE = 'https://hrm.tcfbd.com';
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
const say = (icon, msg) => console.log(`${icon} ${msg}`);
const die = (msg, hint) => { console.error(`\n[FAIL] ${msg}`); if (hint) console.error(`       ${hint}`); process.exit(1); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1. sanity
const branch = sh('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') die(`On branch "${branch}", not main.`, 'CI only deploys pushes to main.');

// Only build-affecting paths block a deploy; "DD files/" notes and the like don't.
const BUILD_PATHS = /^(src\/|php_server\/|public\/|index\.html|package(-lock)?\.json|vite\.config)/;
const dirty = sh('git status --porcelain --untracked-files=no')
  .split('\n').filter(Boolean)
  .map(l => l.slice(3).replace(/^"|"$/g, ''))
  .filter(f => BUILD_PATHS.test(f));
if (dirty.length) {
  die('Uncommitted changes that affect the build:\n       ' + dirty.join('\n       '),
      'Commit them first — CI builds what is on main, not your disk.');
}

const ahead = sh('git rev-list --count @{u}..HEAD');
say('*', ahead === '0' ? 'Nothing new to push — will just re-verify live.' : `${ahead} commit(s) to push.`);

// 2. build before pushing, so a broken build fails here and not in CI
say('*', 'Building locally first...');
const build = spawnSync('npm', ['run', 'build'], { shell: true, encoding: 'utf8' });
if (build.status !== 0) die('Local build failed — not pushing.', ((build.stdout || '') + (build.stderr || '')).split('\n').slice(-12).join('\n'));
const localBundle = sh('ls dist/assets/index-*.js').split('\n')[0].replace('dist/assets/', '');
say('+', `Build OK -> ${localBundle}`);

// 3. push
if (ahead !== '0') {
  say('*', 'Pushing to origin/main...');
  const push = spawnSync('git', ['push', 'origin', 'main'], { shell: true, encoding: 'utf8' });
  if (push.status !== 0) {
    const err = (push.stderr || '') + (push.stdout || '');
    if (/could not read Username|cancelled dialog|Authentication failed|terminal prompts disabled/i.test(err)) {
      die('git push could not authenticate.', 'Run `gh auth login` then `gh auth setup-git` once — see "DD files/deploy.md".');
    }
    die('git push failed.', err.split('\n').slice(-8).join('\n'));
  }
  say('+', 'Pushed. CI "Deploy to cPanel" is now running.');
}

// 4. wait for live to actually serve the new bundle
say('*', 'Waiting for live to serve the new build (up to 10 min)...');
let served = null;
for (let i = 1; i <= 40; i++) {
  try {
    const html = await fetch(`${LIVE}/index.html?cb=${Date.now()}`, { cache: 'no-store' }).then(r => r.text());
    served = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0]?.replace('assets/', '') || null;
    if (served === localBundle) break;
  } catch { /* transient */ }
  process.stdout.write(`\r   attempt ${i}/40 — live is ${served ?? '?'}   `);
  await sleep(15000);
}
console.log('');
if (served !== localBundle) {
  die(`Live still serving ${served}, expected ${localBundle}.`,
      'Check the run: https://github.com/Dibbotcf/Timesheetmanagementsystem/actions');
}
say('+', `Live is serving ${served} — deploy landed.`);

// 5. ZKT guard: CI's `cp -r dist/*` drops .htaccess, which carries the HTTPS-except-/iclock/ rule
say('*', 'Checking ZKT device push still works...');
const status = async (url) => {
  const r = await fetch(url, { redirect: 'manual' }).catch(() => null);
  return r ? r.status : 0;
};
const iclock = await status('http://hrm.tcfbd.com/iclock/cdata?SN=__CANARY__');
const dash = await status('http://hrm.tcfbd.com/dashboard');
if (iclock !== 200) die(`/iclock returned ${iclock}, expected 200 — ZKT device push is BROKEN.`,
  'Force-HTTPS is probably back ON, or .htaccess was lost. See "DD files/deploy.md".');
if (dash !== 301) console.warn(`  [warn] /dashboard returned ${dash}, expected 301 -> HTTPS. Check root .htaccess.`);
say('+', `ZKT canary 200, HTTPS redirect ${dash}.`);

console.log('\nDeployed and verified. Hard-refresh (Ctrl+F5) to see it.\n');
