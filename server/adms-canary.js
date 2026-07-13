// adms-canary.js — external health check for the ADMS device-push ingest path.
//
// The ZKTeco F18 is HTTP-only and pushes to http://hrm.tcfbd.com/iclock/cdata.
// The single fragile link is the "HTTPS-except-/iclock/" .htaccess rule: if it
// ever regresses (e.g. someone adds a blanket force-HTTPS), the device silently
// stops being able to push and attendance quietly stops flowing to live.
//
// This canary verifies that path is reachable over PLAIN HTTP and is NOT
// redirected to HTTPS. It uses the reserved SN "__CANARY__", which the receiver
// answers WITHOUT recording a device contact — so running it never fools the
// health monitor into thinking the real device is alive.
//
//   node server/adms-canary.js
//   ADMS_CANARY_URL="http://hrm.tcfbd.com/iclock/cdata?SN=__CANARY__" node server/adms-canary.js
//
// Exit code 0 = healthy, 1 = ALERT. Wire into cron / an uptime monitor:
//   */5 * * * *  node /path/server/adms-canary.js || <send alert>

const http = require('http');

const URL_STR = process.env.ADMS_CANARY_URL
  || 'http://hrm.tcfbd.com/iclock/cdata?SN=__CANARY__';
const TIMEOUT_MS = parseInt(process.env.ADMS_CANARY_TIMEOUT_MS || '15000', 10);

function fail(msg) { console.error(`CANARY FAIL: ${msg}`); process.exit(1); }
function pass(msg) { console.log(`CANARY OK: ${msg}`); process.exit(0); }

let parsed;
try { parsed = new URL(URL_STR); } catch { fail(`invalid ADMS_CANARY_URL: ${URL_STR}`); }

// Must be plain HTTP — testing over https would defeat the entire purpose.
if (parsed.protocol !== 'http:') {
  fail(`URL must be http:// (got ${parsed.protocol}). The canary exists to prove the PLAINTEXT path works.`);
}

const req = http.request(URL_STR, { method: 'GET', timeout: TIMEOUT_MS }, res => {
  const code = res.statusCode;
  const loc  = res.headers.location || '';
  let body = '';
  res.on('data', d => (body += d));
  res.on('end', () => {
    // A redirect to HTTPS is the exact failure we are guarding against.
    if (code >= 300 && code < 400) {
      if (/^https:/i.test(loc)) {
        fail(`redirected to HTTPS (${code} -> ${loc}). The "HTTPS-except-/iclock/" rule has regressed; the HTTP-only device can no longer push.`);
      }
      fail(`unexpected redirect ${code} -> ${loc}`);
    }
    if (code !== 200) fail(`HTTP ${code} (expected 200) — iclock path not serving`);
    if (!/OK/.test(body)) fail(`200 but body lacks "OK" (got ${JSON.stringify(body.slice(0, 80))}) — not the ADMS receiver`);
    pass(`${URL_STR} -> 200 over plain HTTP, body "${body.trim().slice(0, 40)}"`);
  });
});

req.on('timeout', () => { req.destroy(); fail(`request timed out after ${TIMEOUT_MS}ms — iclock path unreachable`); });
req.on('error', e => fail(`request error: ${e.message}`));
req.end();
