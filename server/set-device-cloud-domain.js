// Change ZKT device cloud server from bare IP to domain name, remotely.
//
//   node server/set-device-cloud-domain.js            → apply
//   node server/set-device-cloud-domain.js --restore  → revert to backup
//
// Writes:
//   ICLOCKSVRURL = hrm.tcfbd.com   (was 103.169.161.66)
//   DNS          = 8.8.8.8         (was 0.0.0.0 — device could not resolve names)
// then restarts the device so the push service reconnects.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const CMD_OPTIONS_RRQ = 11;
const CMD_OPTIONS_WRQ = 12;
const CMD_REFRESHDATA = 1013;
const CMD_REFRESHOPTION = 1014;
const CMD_RESTART = 1004;

const BACKUP_FILE = path.join(__dirname, 'device-cloud-backup.json');
const RESTORE = process.argv.includes('--restore');

const TARGET = {
    ICLOCKSVRURL: 'hrm.tcfbd.com',
    DNS: '8.8.8.8',
};

function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'zkt-device-config.json'), 'utf8')); }
    catch {}
    return { ip: process.env.ZKT_IP || '192.168.68.40', port: parseInt(process.env.ZKT_PORT || '4370', 10) };
}

const printable = buf => {
    let out = '';
    for (const b of buf) out += (b >= 32 && b < 127) ? String.fromCharCode(b) : ' ';
    return out;
};

async function readKey(zk, key) {
    const reply = await zk.executeCmd(CMD_OPTIONS_RRQ, key + '\0');
    const buf = Buffer.isBuffer(reply) ? reply : Buffer.from(String(reply ?? ''));
    const text = printable(buf);
    const m = text.match(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^\\s]*)'));
    return m ? m[1] : null;
}

async function writeKey(zk, key, value) {
    await zk.executeCmd(CMD_OPTIONS_WRQ, `${key}=${value}\0`);
}

async function main() {
    const cfg = readConfig();
    console.log(`Connecting to ${cfg.ip}:${cfg.port}...`);
    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);
    await zk.createSocket();
    console.log('Connected.\n');

    let targets = TARGET;
    if (RESTORE) {
        if (!fs.existsSync(BACKUP_FILE)) { console.error('No backup file found.'); process.exit(1); }
        targets = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        console.log('RESTORE MODE — reverting to backed-up values.\n');
    }

    // 1. Read current values
    const current = {};
    for (const key of Object.keys(targets)) {
        current[key] = await readKey(zk, key);
        console.log(`  current  ${key} = ${current[key]}`);
    }

    // 2. Backup (only in apply mode)
    if (!RESTORE) {
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(current, null, 2));
        console.log(`\nBackup saved → ${BACKUP_FILE}`);
    }

    // 3. Write new values
    console.log('');
    for (const [key, value] of Object.entries(targets)) {
        await writeKey(zk, key, value);
        console.log(`  wrote    ${key} = ${value}`);
    }

    // 4. Read back to verify
    console.log('');
    let ok = true;
    for (const [key, value] of Object.entries(targets)) {
        const got = await readKey(zk, key);
        const match = got === value;
        ok = ok && match;
        console.log(`  readback ${key} = ${got}  ${match ? '✓' : '✗ MISMATCH'}`);
    }

    if (!ok) {
        console.error('\n✗ Readback mismatch — NOT restarting device. Values on device unchanged or partial.');
        await zk.disconnect();
        process.exit(1);
    }

    // 5. Refresh + restart so the push service reconnects with new settings
    try { await zk.executeCmd(CMD_REFRESHOPTION, ''); } catch {}
    try { await zk.executeCmd(CMD_REFRESHDATA, ''); } catch {}
    console.log('\nRestarting device to apply cloud settings...');
    try { await zk.executeCmd(CMD_RESTART, ''); } catch {} // socket dies mid-reply — expected
    try { await zk.disconnect(); } catch {}

    console.log('✓ Done. Device is rebooting (~30–60s).');
    console.log('Verify with: curl https://hrm.tcfbd.com/api/zkt/adms-status  → device_last_seen');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
