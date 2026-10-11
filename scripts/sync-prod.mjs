#!/usr/bin/env node
// Copy production data into the local MySQL database — one way only: production → local.
//   npm run sync:pull   back up local, download production, replace local, verify
//   npm run sync:check  compare local with production, change nothing
// Production is only ever read. Requests go one at a time (shared cPanel account, 100-process cap).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'server', 'package.json')); // mysql2 + dotenv live in server/
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(ROOT, 'server', '.env') });

const PROD = 'https://hrm.tcfbd.com/api';
const BACKUP_DIR = path.join(ROOT, 'unnecessary', 'db-backups');
const BACKUP_PREFIX = 'local_before_pull_';
const KEEP_BACKUPS = 10;
// Every KV type the app uses. Types that exist only in the local DB are added at run time.
const TYPES = ['employees', 'templates', 'folders', 'timesheets', 'signatures', 'leaves', 'ot_records',
  'report_folders', 'saved_reports', 'leave_folders', 'saved_leave_reports', 'issues', 'attendance',
  'leave_files', 'salary_sheets', 'salary_access', 'salary_trash', 'signature_pins'];
const DB = {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'timesheet_db',
};

const mode = process.argv[2];
if (mode !== 'pull' && mode !== 'check') { console.error('Usage: node scripts/sync-prod.mjs pull|check'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (icon, msg) => console.log(`${icon} ${msg}`);
const die = (msg, hint) => { console.error(`\n[FAIL] ${msg}`); if (hint) console.error(`       ${hint}`); process.exit(1); };
const typeOf = key => (key.includes(':') ? key.slice(0, key.indexOf(':')) : key);
const typesFor = items => [...new Set([...TYPES, ...[...items.keys()].map(typeOf).filter(t => /^[a-z_]+$/.test(t))])];
const qid = name => '`' + name.replace(/`/g, '``') + '`';
// Sorted-key JSON, so key order never counts as a difference
const canon = v => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));

// ── Production (read-only) ────────────────────────────────────────────────────
let lastRequest = 0;
async function prod(pathname, asText = false) {
  for (let attempt = 1; ; attempt++) {
    const wait = 300 - (Date.now() - lastRequest);
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetch(PROD + pathname, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return asText ? text : JSON.parse(text);
    } catch (e) {
      if (attempt >= 3) die(`Could not read ${pathname} from production: ${e.message}`, 'The local database was not changed.');
      await sleep(2000 * attempt);
    }
  }
}

async function downloadProduction(types, withBackupContent) {
  const items = new Map(); // "type:id" -> item
  for (const t of types) {
    const list = await prod(`/items/${t}`);
    if (!Array.isArray(list)) die(`Production returned something other than a list for "${t}".`, 'The local database was not changed.');
    for (const item of list) {
      if (item?.id === undefined || item?.id === null || item.id === '') die(`A "${t}" record on production has no id.`, 'The local database was not changed.');
      const key = `${t}:${item.id}`;
      if (items.has(key)) die(`Duplicate id "${item.id}" in "${t}" on production.`, 'The local database was not changed.');
      items.set(key, item);
    }
  }
  const backups = await prod('/backups');
  if (!Array.isArray(backups)) die('Production returned something other than a list for backups.', 'The local database was not changed.');
  if (withBackupContent) {
    for (const b of backups) {
      b.content = await prod('/backups/data?path=' + encodeURIComponent(b.name), true);
      try { JSON.parse(b.content); } catch { die(`Backup "${b.name}" on production is not valid JSON.`, 'The local database was not changed.'); }
    }
  }
  return { items, backups };
}

// ── Local database ────────────────────────────────────────────────────────────
async function connectLocal(create) {
  const conn = await mysql.createConnection({ host: DB.host, port: DB.port, user: DB.user, password: DB.password })
    .catch(e => die(`Cannot connect to local MySQL: ${e.message}`, 'Is the MySQL80 service running? Credentials come from server/.env.'));
  const [[dbRow]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [DB.database]);
  const existed = dbRow.n > 0;
  if (!existed && !create) return { conn, existed };
  if (!existed) await conn.query(`CREATE DATABASE ${qid(DB.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE ${qid(DB.database)}`);
  if (create) {
    await conn.query(`CREATE TABLE IF NOT EXISTS kv_store (
      \`key\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`value\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      PRIMARY KEY (\`key\`), CHECK (json_valid(\`value\`))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await conn.query(`CREATE TABLE IF NOT EXISTS backups (
      id int NOT NULL AUTO_INCREMENT, name varchar(255) NOT NULL, content longtext NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  return { conn, existed };
}

async function readLocal(conn) {
  const [rows] = await conn.query('SELECT `key`, `value` FROM kv_store');
  const items = new Map(rows.map(r => [r.key, JSON.parse(Buffer.isBuffer(r.value) ? r.value.toString('utf8') : String(r.value))]));
  const [backups] = await conn.query("SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, LENGTH(content) AS size FROM backups ORDER BY id");
  return { items, backups };
}

function backupLocal() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const file = path.join(BACKUP_DIR, `${BACKUP_PREFIX}${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.sql`);
  const fd = fs.openSync(file, 'w');
  const r = spawnSync('mysqldump', ['-h', DB.host, '-P', String(DB.port), '-u', DB.user, '--single-transaction',
    '--default-character-set=utf8mb4', DB.database], { stdio: ['ignore', fd, 'pipe'], env: { ...process.env, MYSQL_PWD: DB.password }, encoding: 'utf8' });
  fs.closeSync(fd);
  if (r.error || r.status !== 0) {
    fs.rmSync(file, { force: true });
    die(`Backing up the local database failed: ${r.error?.message || (r.stderr || '').trim()}`,
      'Nothing was changed. mysqldump must be on PATH (C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin).');
  }
  // keep only the newest automatic backups (hand-made ones have other names and are never touched)
  fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(BACKUP_PREFIX)).sort().reverse()
    .slice(KEEP_BACKUPS).forEach(f => fs.rmSync(path.join(BACKUP_DIR, f)));
  return file;
}

async function replaceLocal(conn, items, backups) {
  const rows = [...items].map(([key, item]) => [key, JSON.stringify(item)]);
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM kv_store');
    await conn.query('DELETE FROM backups');
    // batch by size so a few large leave files never exceed max_allowed_packet
    for (let i = 0; i < rows.length;) {
      const batch = [];
      let bytes = 0;
      while (i < rows.length && (batch.length === 0 || bytes + rows[i][1].length < 8e6) && batch.length < 500) { bytes += rows[i][1].length; batch.push(rows[i++]); }
      await conn.query('INSERT INTO kv_store (`key`, `value`) VALUES ?', [batch]);
    }
    for (const b of backups) await conn.query('INSERT INTO backups (id, name, content, created_at) VALUES (?, ?, ?, ?)', [b.id, b.name, b.content, b.created_at]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    die(`Writing to the local database failed: ${e.message}`, 'The change was rolled back; the local data is as it was.');
  }
}

// ── Compare ───────────────────────────────────────────────────────────────────
function compare(local, prodData, types) {
  const report = types.map(t => {
    const l = [...local.items].filter(([k]) => typeOf(k) === t);
    const p = [...prodData.items].filter(([k]) => typeOf(k) === t);
    const pMap = new Map(p.map(([k, v]) => [k, canon(v)]));
    const lMap = new Map(l.map(([k, v]) => [k, canon(v)]));
    const localOnly = l.filter(([k]) => !pMap.has(k)).length;
    const prodOnly = p.filter(([k]) => !lMap.has(k)).length;
    const changed = l.filter(([k]) => pMap.has(k) && pMap.get(k) !== lMap.get(k)).length;
    return { name: t, local: l.length, prod: p.length, same: !localOnly && !prodOnly && !changed, localOnly, prodOnly, changed };
  });
  const sig = b => `${b.id}|${b.name}|${b.created_at}|${b.size ?? b.metadata?.size ?? Buffer.byteLength(b.content ?? '', 'utf8')}`;
  const lb = local.backups.map(sig).sort(), pb = prodData.backups.map(sig).sort();
  report.push({ name: 'backup snapshots', local: lb.length, prod: pb.length, same: lb.join() === pb.join() });
  return report;
}

function printReport(report, beforeLabel, afterLabel) {
  console.log(`\n  ${'Data'.padEnd(20)} ${beforeLabel.padStart(12)} ${afterLabel.padStart(12)}`);
  for (const r of report) {
    const note = r.same ? 'same' : r.localOnly === undefined ? 'DIFFERENT'
      : `DIFFERENT (${[r.localOnly && `${r.localOnly} only local`, r.prodOnly && `${r.prodOnly} only production`, r.changed && `${r.changed} changed`].filter(Boolean).join(', ')})`;
    console.log(`  ${r.name.padEnd(20)} ${String(r.local).padStart(12)} ${String(r.prod).padStart(12)}   ${note}`);
  }
  console.log('');
}

// ── Run ───────────────────────────────────────────────────────────────────────
const { conn, existed } = await connectLocal(mode === 'pull');
try {
  if (mode === 'check') {
    if (!existed) die(`The local database "${DB.database}" does not exist yet.`, 'Run `npm run sync:pull` to create it and copy production into it.');
    await conn.query(`USE ${qid(DB.database)}`);
    const local = await readLocal(conn).catch(e => die(`Cannot read the local database: ${e.message}`, 'Run `npm run sync:pull` to create the tables.'));
    const types = typesFor(local.items);
    say('*', 'Reading production (read-only)...');
    const prodData = await downloadProduction(types, false);
    const report = compare(local, prodData, types);
    printReport(report, 'Local', 'Production');
    if (report.every(r => r.same)) say('+', 'Local and production have the same data.');
    else say('!', 'Local differs from production. Run `npm run sync:pull` to copy production into local.');
  } else {
    const before = await readLocal(conn);
    const types = typesFor(before.items);
    const hasData = before.items.size > 0 || before.backups.length > 0;
    let backupFile = null;
    if (hasData) {
      say('*', `Backing up the local database "${DB.database}"...`);
      backupFile = backupLocal();
      say('+', `Backup saved: ${path.relative(ROOT, backupFile)}`);
    } else {
      say('*', existed ? 'Local database is empty — nothing to back up.' : `Created the local database "${DB.database}".`);
    }

    say('*', 'Downloading production (read-only, one request at a time)...');
    const prodData = await downloadProduction(types, true);
    say('+', `Downloaded ${prodData.items.size} records and ${prodData.backups.length} backup snapshots.`);

    say('*', 'Replacing local data...');
    await replaceLocal(conn, prodData.items, prodData.backups);

    const after = await readLocal(conn);
    const verify = compare(after, prodData, types);
    const beforeCount = new Map(compare(before, prodData, types).map(r => [r.name, r.local]));
    printReport(verify.map(r => ({ ...r, prod: r.local, local: beforeCount.get(r.name) })), 'Before', 'Now');
    if (!verify.every(r => r.same)) {
      die('After the copy, local does not match what was downloaded.',
        backupFile ? `Restore the previous data with: mysql -u ${DB.user} -p ${DB.database} < "${path.relative(ROOT, backupFile)}"` : undefined);
    }
    say('+', 'Local now matches production. Refresh the browser (Ctrl+F5) to see it.');
  }
} finally {
  await conn.end();
}
