// auto-sync.js — Automatic ZKT device → live server sync
//
// Runs in background on the office PC while the local server is running.
// Every 2 minutes it pulls new attendance from the device and pushes to live.
//
// Start:  node server/auto-sync.js
// Stop:   Ctrl+C

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

const ZKLib = require('node-zklib');

const LIVE_URL    = process.env.LIVE_SYNC_URL || 'https://hrm.tcfbd.com/api/zkt/sync';
const INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '120000', 10); // 2 minutes
const STATE_FILE  = path.join(__dirname, 'sync-state.json');

function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'zkt-device-config.json'), 'utf8')); }
    catch {}
    return { ip: process.env.ZKT_IP || '192.168.68.40', port: parseInt(process.env.ZKT_PORT || '4370', 10) };
}

function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
    catch {}
    return { lastSyncTime: null, totalPushed: 0, usersSynced: false };
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function postJson(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 30000,
        }, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { resolve({ raw }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(body);
        req.end();
    });
}

function log(msg) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    console.log(`[${ts}] ${msg}`);
}

async function syncOnce(state) {
    const cfg = readConfig();
    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);

    try {
        await zk.createSocket();
    } catch (e) {
        log(`Device unreachable (${e.message}) — will retry in ${INTERVAL_MS / 60000} min`);
        return;
    }

    try {
        // Always sync users on first run, then once per hour
        const hourAgo = Date.now() - 3600000;
        const needsUserSync = !state.usersSynced || (state.lastUserSync && Date.now() - state.lastUserSync > 3600000);
        let users = [];
        if (needsUserSync) {
            const { data } = await zk.getUsers();
            users = data.map(u => ({
                uid:      u.uid ?? 0,
                userId:   String(u.userId ?? u.user_id ?? ''),
                name:     u.name ?? '',
                role:     u.role ?? 0,
                password: u.password ?? '',
                cardno:   u.cardno ?? 0,
            }));
        }

        // Always fetch attendance — server deduplicates.
        // node-zklib returns recordTime as a Date — format as device-local
        // "YYYY-MM-DDTHH:mm:ss" to match what ADMS push writes (no Z, no ms).
        const p = n => String(n).padStart(2, '0');
        const fmtLocal = d =>
            `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        const toIso = v => {
            if (v instanceof Date) return fmtLocal(v);
            const s = String(v ?? '').trim();
            if (!s) return '';
            const d = new Date(s);
            return isNaN(d) ? s.replace(' ', 'T') : fmtLocal(d);
        };
        const { data: logs } = await zk.getAttendances();
        const records = logs.map(r => ({
            deviceUserId: String(r.deviceUserId ?? r.user_id ?? ''),
            recordTime:   toIso(r.recordTime ?? r.record_time),
        })).filter(r => r.deviceUserId && r.recordTime);

        await zk.disconnect();

        // Only push if there's something new
        if (records.length === 0 && users.length === 0) {
            log('Nothing to sync.');
            return;
        }

        const payload = { records };
        if (users.length > 0) payload.users = users;

        const result = await postJson(LIVE_URL, payload);
        if (result.success) {
            state.totalPushed += result.att_added || 0;
            state.lastSyncTime = new Date().toISOString();
            if (users.length > 0) { state.usersSynced = true; state.lastUserSync = Date.now(); }
            saveState(state);

            const addedMsg = result.att_added > 0 ? `+${result.att_added} new records` : 'no new records';
            const userMsg  = users.length > 0 ? ` · ${users.length} users` : '';
            log(`Synced — ${addedMsg}${userMsg} (total pushed: ${state.totalPushed})`);
        } else {
            log(`Server rejected sync: ${JSON.stringify(result)}`);
        }
    } catch (e) {
        try { await zk.disconnect(); } catch {}
        log(`Sync error: ${e.message}`);
    }
}

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   ZKT Auto-Sync  →  hrm.tcfbd.com               ║');
    console.log(`║   Syncing every ${(INTERVAL_MS/60000).toFixed(0)} minutes                          ║`);
    console.log('║   Press Ctrl+C to stop                           ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    const state = loadState();
    if (state.lastSyncTime) log(`Last sync was: ${state.lastSyncTime}`);

    // Run immediately on start
    log('Starting initial sync...');
    await syncOnce(state);

    // Then repeat on interval
    setInterval(async () => {
        log('Running scheduled sync...');
        await syncOnce(state);
    }, INTERVAL_MS);
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
