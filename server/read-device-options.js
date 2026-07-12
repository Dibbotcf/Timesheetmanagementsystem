// Read-only probe of ZKT device option table (CMD_OPTIONS_RRQ = 11).
// Finds which option keys store the ADMS/cloud server address so we can
// change it remotely. Makes NO changes to the device.
//
//   node server/read-device-options.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const CMD_OPTIONS_RRQ = 11;

function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'zkt-device-config.json'), 'utf8')); }
    catch {}
    return { ip: process.env.ZKT_IP || '192.168.68.40', port: parseInt(process.env.ZKT_PORT || '4370', 10) };
}

// Round 2: address-key variants + full dump attempts
const KEYS = [
    'all', 'All', '~all', 'options',
    'WebServerIP', 'WebSrvIP', 'WEBSERVERIP', 'WebServerAddress', 'WebServerAddr',
    'WebServerURL', 'WebServerDomain', 'WebServerDomainName', 'WebServerName',
    'ICLOCKSVRURL', 'CenterAddr', 'CENTERADDR', 'RemoteSrvAddr',
    'IsSupportURL', 'URLEnable', 'SupportDomain', 'DomainEnable', 'WebDomain',
    'BeURL', 'IsURL', 'SrvURLEnable',
    'ProxyEnable', 'ProxyIP', 'ProxyPort', 'ProxyServerIP', 'ProxyFunOn',
];

const printable = buf => {
    const runs = [];
    let cur = '';
    for (const b of buf) {
        if (b >= 32 && b < 127) cur += String.fromCharCode(b);
        else { if (cur.length >= 2) runs.push(cur); cur = ''; }
    }
    if (cur.length >= 2) runs.push(cur);
    return runs.join(' ');
};

async function main() {
    const cfg = readConfig();
    console.log(`Connecting to ${cfg.ip}:${cfg.port}...`);
    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);
    await zk.createSocket();
    console.log('Connected. Probing option keys (read-only)...\n');

    for (const key of KEYS) {
        try {
            const reply = await zk.executeCmd(CMD_OPTIONS_RRQ, key + '\0');
            const buf = Buffer.isBuffer(reply) ? reply : Buffer.from(String(reply ?? ''));
            const text = printable(buf);
            // Show any reply that carries readable content
            if (text.includes('=') || text.length > 12) {
                console.log(`  [${key}] ${text}`);
            }
        } catch (e) {
            // unknown key or read error — skip silently
        }
    }

    await zk.disconnect();
    console.log('\nDone (no changes made).');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
