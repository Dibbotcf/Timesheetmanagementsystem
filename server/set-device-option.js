// Write arbitrary option keys on the ZKT device with readback verification.
//
//   node server/set-device-option.js KEY=VALUE [KEY=VALUE ...] [--restart]
//
// Example:
//   node server/set-device-option.js ICLOCKSVRURL=hrm.tcfbd.com WebServerPort=80 --restart

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const CMD_OPTIONS_RRQ = 11;
const CMD_OPTIONS_WRQ = 12;
const CMD_REFRESHOPTION = 1014;
const CMD_RESTART = 1004;

const args = process.argv.slice(2);
const RESTART = args.includes('--restart');
const pairs = args.filter(a => a.includes('='));
if (pairs.length === 0) { console.error('Usage: node set-device-option.js KEY=VALUE [--restart]'); process.exit(1); }

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
    const m = printable(buf).match(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^\\s]*)'));
    return m ? m[1] : null;
}

async function main() {
    const cfg = readConfig();
    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);
    await zk.createSocket();

    for (const pair of pairs) {
        const idx = pair.indexOf('=');
        const key = pair.slice(0, idx), value = pair.slice(idx + 1);
        const before = await readKey(zk, key);
        await zk.executeCmd(CMD_OPTIONS_WRQ, `${key}=${value}\0`);
        const after = await readKey(zk, key);
        console.log(`${key}: ${before} → ${after} ${after === value ? '✓' : '✗ MISMATCH'}`);
    }

    try { await zk.executeCmd(CMD_REFRESHOPTION, ''); } catch {}
    if (RESTART) {
        console.log('Restarting device...');
        try { await zk.executeCmd(CMD_RESTART, ''); } catch {}
    }
    try { await zk.disconnect(); } catch {}
    console.log('Done.');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
