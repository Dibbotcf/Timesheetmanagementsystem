// Sync ZKT device data from local office PC → live server (hrm.tcfbd.com)
//
// Run this from the office PC while connected to the same LAN as the ZKT device:
//   node server/sync-to-live.js
//
// It connects directly to the device, pulls all attendance + users,
// then uploads everything to the live PHP backend.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const http = require('http');
const https= require('https');

const ZKLib = require('node-zklib');

const LIVE_URL = process.env.LIVE_SYNC_URL || 'https://hrm.tcfbd.com/api/zkt/sync';

function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'zkt-device-config.json'), 'utf8')); }
    catch {}
    return { ip: process.env.ZKT_IP || '192.168.68.40', port: parseInt(process.env.ZKT_PORT || '4370', 10) };
}

function postJson(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { resolve({ raw }); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const cfg = readConfig();
    console.log(`\nConnecting to ZKT device at ${cfg.ip}:${cfg.port}...`);

    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);
    await zk.createSocket();
    console.log('Connected.\n');

    console.log('Fetching users...');
    const { data: users } = await zk.getUsers();
    console.log(`  ${users.length} users found.`);

    console.log('Fetching attendance records (may take a moment for large datasets)...');
    const { data: logs } = await zk.getAttendances();
    console.log(`  ${logs.length} attendance records found.`);

    await zk.disconnect();
    console.log('Disconnected from device.\n');

    // Map to the same format the PHP backend expects
    const records = logs.map(r => ({
        deviceUserId: String(r.deviceUserId ?? r.user_id ?? ''),
        recordTime:   (r.recordTime ?? r.record_time ?? '').replace(' ', 'T'),
    })).filter(r => r.deviceUserId && r.recordTime);

    const userList = users.map(u => ({
        uid:      u.uid ?? 0,
        userId:   String(u.userId ?? u.user_id ?? ''),
        name:     u.name ?? '',
        role:     u.role ?? 0,
        password: u.password ?? '',
        cardno:   u.cardno ?? 0,
    }));

    console.log(`Uploading to live server: ${LIVE_URL}`);
    console.log(`  ${records.length} records · ${userList.length} users...`);

    const result = await postJson(LIVE_URL, { records, users: userList });

    if (result.success) {
        console.log(`\n✓ Sync complete!`);
        console.log(`  New attendance records added : ${result.att_added}`);
        console.log(`  Users saved                 : ${result.users_saved}`);
        console.log('\nThe live site (hrm.tcfbd.com) now has up-to-date data.');
        console.log('Reload the attendance report page to see the data.\n');
    } else {
        console.error('\n✗ Upload failed:', result);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('\nError:', err.message);
    process.exit(1);
});
