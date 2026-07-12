// Device user cleanup script
// Keeps ONLY the 23 listed employees, deletes everything else
//
// Dry run (preview only, no deletions):
//   node cleanup-device-users.js --dry-run
//
// Actually delete:
//   node cleanup-device-users.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');

const ZKLib = require('node-zklib');

const DRY_RUN = process.argv.includes('--dry-run');

// Read IP/port from saved config or env
function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'zkt-device-config.json'), 'utf8')); }
    catch {}
    return { ip: process.env.ZKT_IP || '192.168.68.40', port: parseInt(process.env.ZKT_PORT || '4370', 10) };
}

// ── Employees to KEEP ────────────────────────────────────────────────────────
const KEEP_NAMES = [
  'Abu Talha',
  'Rokiya Hossain Era',
  'Md. Showkat Akber',
  'Latifa Yesmeen',
  'Md. Mostafa Kamal',
  'Ashita Anowar',
  'Sheak Abdul Hadi',
  'Md Yousuf',
  'Rabeya Akter',
  'Jahid Hasan',
  'Md. Amir Hamza',
  'Md. Mostafa Faisal Pran',
  'Taiki Taninokuchi',
  'ANIKA AKTER TONIMA',
  'Dibbo Dutta',
  'Setu Pramanik',
  'Harun Or Rashid',
  'Trisha',
  'Nishat Tasnim',
  'Fumihiro Abe',
  'Sumaiya Farhana',
  'Ryota Tsukada',
  'Bappy',
];

const KEEP_NORMALIZED = new Set(KEEP_NAMES.map(n => n.trim().toLowerCase()));

function encodeUserData72(user) {
    const buf = Buffer.alloc(72);
    buf.writeUInt16LE(user.uid || 0, 0);
    buf.writeUInt8(user.role || 0, 2);
    const pwd  = Buffer.from(user.password || '', 'ascii');
    pwd.copy(buf, 3, 0, Math.min(pwd.length, 8));
    const name = Buffer.from(user.name || '', 'ascii');
    name.copy(buf, 11, 0, Math.min(name.length, 24));
    buf.writeUInt32LE(user.cardno || 0, 35);
    const uid  = Buffer.from(String(user.userId || ''), 'ascii');
    uid.copy(buf, 48, 0, Math.min(uid.length, 9));
    return buf;
}

const CMD_DELETE_USER = 18;
const CMD_REFRESHDATA = 1013;

async function main() {
    const cfg = readConfig();

    if (DRY_RUN) console.log('\n⚠  DRY RUN — no changes will be made to the device.\n');

    console.log(`Connecting to ZKT device at ${cfg.ip}:${cfg.port}...`);
    const zk = new ZKLib(cfg.ip, cfg.port, 10000, 10000);
    await zk.createSocket();
    console.log('Connected.\n');

    const { data: users } = await zk.getUsers();
    console.log(`Device has ${users.length} users:\n`);

    const toDelete = [];

    for (const u of users) {
        const name = (u.name || '').trim();
        const isNumeric  = (!isNaN(Number(name)) || name === '');
        const inKeepList = KEEP_NORMALIZED.has(name.toLowerCase());

        if (isNumeric || !inKeepList) {
            toDelete.push(u);
            console.log(`  ✗  WILL DELETE : uid=${u.uid}  userId="${u.userId}"  name="${name || '(empty)'}"`)
        } else {
            console.log(`  ✓  KEEP        : uid=${u.uid}  name="${name}"`);
        }
    }

    console.log('\n─────────────────────────────────────');
    console.log(`To keep   : ${users.length - toDelete.length}`);
    console.log(`To delete : ${toDelete.length}`);

    if (toDelete.length === 0) {
        console.log('\nDevice is already clean. Nothing to do.');
        await zk.disconnect();
        return;
    }

    if (DRY_RUN) {
        console.log('\n[DRY RUN] No deletions performed.');
        console.log('Run without --dry-run to actually delete the listed users.');
        await zk.disconnect();
        return;
    }

    console.log('\nDeleting...');
    for (const u of toDelete) {
        const packet = encodeUserData72({
            uid: u.uid, userId: u.userId || '',
            name: '', cardno: 0, password: '', role: 0
        });
        await zk.executeCmd(CMD_DELETE_USER, packet);
        console.log(`  Deleted uid=${u.uid}  name="${(u.name || '').trim() || '(empty)'}"`);
    }

    await zk.executeCmd(CMD_REFRESHDATA, '');
    await zk.disconnect();

    console.log(`\nDone. ${toDelete.length} user(s) deleted.`);
}

main().catch(err => {
    console.error('\nError:', err.message);
    process.exit(1);
});
