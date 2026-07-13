// adms-selftest.js — local, zero-risk end-to-end test of the ADMS receiver.
//
// Runs the REAL php_server/index.php in an isolated temp dir with stubbed
// db.php / zkteco.php (so it needs no MySQL and touches no production data),
// then drives it over HTTP and asserts the hardening behaves correctly:
//   dedup · flock write · latency capture · health states · canary isolation.
//
//   node server/adms-selftest.js         (requires PHP 8+ on PATH)
//
// Exit 0 = all pass, 1 = a test failed.

const { spawn } = require('child_process');
const http = require('http');
const net  = require('net');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

let BASE = '';                                  // set once a free port is chosen
const SRC = path.join(__dirname, '..', 'php_server', 'index.php');

// Grab an ephemeral free port so repeated runs never collide with a leftover.
function freePort() {
  return new Promise(res => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

// php -S doesn't die from a plain SIGTERM on Windows — kill the whole tree.
function killServer(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') { try { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']); } catch {} }
  else child.kill();
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else      { console.log(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); fail++; }
}

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + urlPath, { method, timeout: 8000 }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, text: d, json: j }); });
    });
    r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(SRC)) { console.error(`Cannot find ${SRC}`); process.exit(1); }

  // Build isolated harness
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adms-selftest-'));
  fs.copyFileSync(SRC, path.join(dir, 'index.php'));
  fs.writeFileSync(path.join(dir, 'db.php'),
    `<?php function get_item($k){return null;} function set_item($k,$v){} function del_item($k){} function get_by_prefix($p){return [];} $pdo=null;`);
  fs.writeFileSync(path.join(dir, 'zkteco.php'),
    `<?php class ZKTeco { public function __construct(...$a){} public function connect(){} public function disconnect(){} public function getInfo(){return [];} public function getAttendances(){return [];} public function getUsers(){return [];} }`);

  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, 'index.php'], { cwd: dir });
  let phpErr = '';
  php.stderr.on('data', d => phpErr += d);
  php.on('error', e => { console.error(`Failed to start PHP (is it on PATH?): ${e.message}`); process.exit(1); });

  try {
    // Wait for the server
    let up = false;
    for (let i = 0; i < 25; i++) { try { const h = await req('GET', '/api/health'); if (h.status === 200) { up = true; break; } } catch {} await sleep(200); }
    if (!up) throw new Error(`PHP server never came up.\n${phpErr}`);

    console.log('\nADMS receiver self-test\n');

    // 1. Fresh state
    let s = (await req('GET', '/api/zkt/adms-status')).json;
    check('fresh: health = never_seen', s.health.status === 'never_seen', s.health.status);
    check('fresh: 0 latency samples', s.latency.samples === 0);

    // 2. Canary must not create a device contact
    const canary = await req('GET', '/iclock/cdata?SN=__CANARY__');
    check('canary returns "OK CANARY"', canary.text.trim() === 'OK CANARY', JSON.stringify(canary.text));
    s = (await req('GET', '/api/zkt/adms-status')).json;
    check('canary did NOT set last_seen (still never_seen)', s.health.status === 'never_seen', s.health.status);

    // 3. Real ATTLOG push (2 punches)
    const body = ['21\t2026-07-13 09:10:12\t0\t4\t\t0\t0', '22\t2026-07-13 09:11:00\t0\t1\t\t0\t0'].join('\n');
    const ack = await req('POST', '/iclock/cdata?SN=DEV1&table=ATTLOG', body);
    check('push acked "OK: 2"', ack.text.trim() === 'OK: 2', JSON.stringify(ack.text));
    s = (await req('GET', '/api/zkt/adms-status')).json;
    check('after push: health = healthy', s.health.status === 'healthy', s.health.status);
    check('after push: 2 attendance records', s.adms_attendance_records === 2, String(s.adms_attendance_records));
    check('after push: 2 latency samples', s.latency.samples === 2, String(s.latency.samples));
    check('after push: transport p95 present', s.latency.transport_seconds.p95 !== null);

    // 4. Re-push the same rows → dedup, no skew
    await req('POST', '/iclock/cdata?SN=DEV1&table=ATTLOG', body);
    s = (await req('GET', '/api/zkt/adms-status')).json;
    check('re-push: still 2 records (dedup)', s.adms_attendance_records === 2, String(s.adms_attendance_records));
    check('re-push: still 2 samples (no skew)', s.latency.samples === 2, String(s.latency.samples));

    // 5. monitor mode healthy → 200
    const mon = await req('GET', '/api/zkt/adms-status?monitor=1');
    check('?monitor returns 200 when healthy', mon.status === 200, String(mon.status));

  } catch (e) {
    console.error(`\nERROR: ${e.message}`);
    fail++;
  } finally {
    killServer(php);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
