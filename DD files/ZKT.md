# ZKTeco → Live Server Connectivity

> **Purpose:** How the ZKTeco biometric device gets attendance data onto the live
> site (**hrm.tcfbd.com**), what was done to make it work, and how to verify /
> troubleshoot it.
>
> **Last verified:** 2026-07-13 — device reachable on LAN, Cloud Push active on
> live (banner: *"Device Connected · Cloud Push · via hrm.tcfbd.com"*).

---

## TL;DR

The device is **not reachable from the internet** — only from the office LAN. So
the live site can never talk to the device directly. Instead, data reaches live by
being **pushed** to it. There are two independent push paths:

1. **Primary — ADMS Cloud Push (device-driven, near real-time).**
   The device itself POSTs each punch to `hrm.tcfbd.com` using ZKTeco's PUSH/ADMS
   protocol. This is what makes live work with *no PC running*.
2. **Backup — Office-PC sync (deterministic, every 2 min).**
   `auto-sync.js` on the office PC pulls from the device over LAN and POSTs to the
   live `/api/zkt/sync` endpoint. Guarantees live never drifts more than ~2 min
   behind, even if the device's own push stalls.

The **local** dev site is different again: it reads the device **directly** over
TCP in real time, so it is always the freshest view (the source of truth).

---

## Architecture — the three views

```
                         ┌─────────────────────────┐
   ZKTeco F18            │  Office LAN (192.168.68.x)│
   192.168.68.40:4370    └─────────────────────────┘
        │
        │  (A) direct TCP read, real-time          →  LOCAL dev site (localhost:3002)
        │      /api/zkt/attendance                     always current, source of truth
        │
        │  (B) ADMS PUSH  /iclock/cdata  (HTTP:80) →  LIVE  (hrm.tcfbd.com)
        │      device POSTs each punch itself          near real-time, no PC needed
        │
        └─ (C) office PC: auto-sync.js pulls LAN   →  LIVE  /api/zkt/sync
               then POSTs to live every 2 min           backup, deterministic
```

- **(A)** Local Node backend (`server/index.js`) → real-time.
- **(B)** Device firmware → iclock proxy → live PHP ADMS receiver.
- **(C)** Office PC Node script → live PHP bulk-sync endpoint.

---

## The device

| Item | Value |
|------|-------|
| Model | ZKTeco F18 biometric |
| LAN IP / port | `192.168.68.40 : 4370` (TCP) |
| Machine No. | 102 |
| Named employees | 23 |
| Total punches | ~24,150 (grows continuously) |
| Reachable from | **Office LAN only** — not the public internet |

### Current on-device cloud/ADMS options (read-only probe, 2026-07-13)

| Option key | Value | Meaning |
|------------|-------|---------|
| `ICLOCKSVRURL` | `hrm.tcfbd.com` | Cloud server the device pushes to |
| `WebServerPort` | `80` | Pushes over **HTTP:80** (device is HTTP-only) |
| `DNS` | `8.8.8.8` | So the device can resolve the domain name |
| `Realtime` / `TransInterval` / `TransTimes` | *(unset)* | Uses firmware default → **near real-time push** |

> **Original values (backed up in `server/device-cloud-backup.json`):**
> `ICLOCKSVRURL = 103.169.161.66`, `DNS = 0.0.0.0`.
> These are restorable — see *Rollback* below.

---

## How live connectivity was established (the process)

This is the sequence of work that made the device push to live successfully.

### 1. Point the device at the live server (remote reconfig)

The device originally pushed to a bare IP (`103.169.161.66`) and had no DNS
(`0.0.0.0`), so it could not resolve a domain name. It was reconfigured **remotely
over the LAN** (no physical access to the device menu) using:

```bash
node server/set-device-cloud-domain.js
```

That script does, with read-back verification and an automatic backup:

1. Reads current `ICLOCKSVRURL` + `DNS` and **backs them up** to `device-cloud-backup.json`.
2. Writes `ICLOCKSVRURL = hrm.tcfbd.com` and `DNS = 8.8.8.8`.
3. Reads back to confirm the write took (aborts if mismatch — will **not** restart on a bad write).
4. Refreshes options and **restarts the device** (~30–60 s) so the push service reconnects with the new target.

Under the hood it uses ZKTeco option commands:
`OPTIONS_RRQ=11` (read), `OPTIONS_WRQ=12` (write), `REFRESHOPTION=1014`,
`REFRESHDATA=1013`, `RESTART=1004`.

Supporting tools used during setup:
- `node server/read-device-options.js` — read-only probe to discover which option keys hold the server address.
- `node server/set-device-option.js KEY=VALUE [--restart]` — set arbitrary option keys with read-back (e.g. `WebServerPort=80`).

### 2. Deploy the iclock proxy on the live domain

The device speaks ZKTeco's PUSH/ADMS protocol at URLs like `/iclock/cdata`,
`/iclock/getrequest`. An **iclock proxy** was deployed to the primary domain via
FTP so those requests land on the app backend.

Verify the proxy is live:
```bash
curl http://103.169.161.66/iclock/cdata?SN=TEST   # must return plain text
```

### 3. Allow HTTP (not forced HTTPS) for /iclock/ only

The device is **HTTP-only** and cannot do TLS. The live site otherwise forces
HTTPS. An `.htaccess` rule was added: **"HTTPS-except-/iclock/"** — everything
redirects to HTTPS *except* the `/iclock/` path, so the device can still POST over
plain HTTP:80 while the rest of the site stays secure.

### 4. Live-side ADMS receiver

The live PHP backend has an **ADMS push receiver** that:
- Accepts the device's `ATTLOG` POST bodies at the iclock endpoint.
- Parses each attendance line, taking the **DateTime from field[1]** (not field[2] — this was a bug that was fixed).
- Stores new records, **de-duplicates**, and caches ZKTeco user names so reports show names even when the device is offline.

### 5. Diagnostics + status banner

- `/api/zkt/adms-status` — diagnostic endpoint reporting `device_last_seen` and push health.
- The report page banner now shows **Cloud Push** connectivity (source + last-push time), so you can tell at a glance whether live is receiving pushes.

---

## Backup sync path (office PC → live)

Even with Cloud Push working, a deterministic backup exists for when the device's
own push stalls or you want an immediate catch-up. Both scripts connect to the
device over LAN, pull attendance + users, and POST to `hrm.tcfbd.com/api/zkt/sync`
(the live server **de-duplicates**, so re-running is safe/idempotent).

| Script | Use |
|--------|-----|
| `node server/auto-sync.js` | **Continuous.** Immediate push on start, then every **2 min**. Leave running on the office PC whenever it's on. |
| `node server/sync-to-live.js` | **One-shot.** Pull everything once, push, print `New records added: N`, exit. |

Notes:
- Both format `recordTime` as **device-local** `YYYY-MM-DDTHH:mm:ss` (no `Z`, no ms) to match exactly what the ADMS push writes — this avoids timezone drift and duplicate rows.
- Live target defaults to `https://hrm.tcfbd.com/api/zkt/sync` (override with `LIVE_SYNC_URL`).
- Interval override: `SYNC_INTERVAL_MS` (default `120000`).
- `auto-sync.js` also syncs the user list on first run and once per hour.

---

## ADMS push timing — how long until live shows a punch?

Because `Realtime` / `TransInterval` / `TransTimes` are **unset** on the device, it
runs the PUSH protocol in its **default near-real-time mode**:

- **Typical:** a punch appears on live within **~seconds to ~1 minute**.
- **Worst case:** a few minutes — if the punch lands right after a push cycle, during
  a heartbeat gap, or the connection hiccups and retries next cycle.
- It is **not instant and not guaranteed.** There is always a small window.

This is exactly why local (direct read) is always a step ahead of live (pushed
copy), and why the `auto-sync.js` backup exists — it caps the drift at ~2 minutes
regardless of the device's best-effort push.

---

## Verify it's working

```bash
# 1. Device reachable + pushing (from office LAN):
curl https://hrm.tcfbd.com/api/zkt/adms-status      # check device_last_seen is recent

# 2. iclock proxy alive:
curl http://103.169.161.66/iclock/cdata?SN=TEST     # returns plain text

# 3. Live report page:
#    hrm.tcfbd.com/reports → banner should read "Device Connected · Cloud Push"
#    with a recent "Last push" time.

# 4. Local real-time (source of truth), from LAN:
curl http://localhost:3001/api/zkt/status           # {"connected":true,...}
```

Expected on the report page: today's punches with a matching count on both local
and (within a couple of minutes) live.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Live a few entries behind local | **Normal** — ADMS push lag. Wait ~1–2 min, or run `node server/sync-to-live.js` for an instant catch-up. |
| Live shows "No records found" | iclock proxy not deployed, or device never pushed. Confirm proxy (`curl …/iclock/cdata?SN=TEST`), then run `node server/sync-to-live.js` once. |
| Live totally stale, `device_last_seen` old | Device stopped pushing. Check it's powered on and on the LAN; re-run `set-device-cloud-domain.js` (writes URL/DNS + restart). |
| Device push over HTTPS fails | Device is HTTP-only — ensure the `.htaccess` "HTTPS-except-/iclock/" rule is in place so `/iclock/` stays on HTTP:80. |
| Wrong times on live | `recordTime` timezone/format mismatch. Sync scripts must emit device-local `YYYY-MM-DDTHH:mm:ss`; ADMS receiver must read DateTime from **field[1]**. |
| Device unreachable locally | Must be on the `192.168.68.x` LAN. `ping 192.168.68.40`, confirm port 4370 open, device powered on. |

---

## Rollback

Revert the device's cloud settings to the original backed-up values:

```bash
node server/set-device-cloud-domain.js --restore
```

Restores `ICLOCKSVRURL = 103.169.161.66`, `DNS = 0.0.0.0` from
`server/device-cloud-backup.json`, then restarts the device.

---

## Script reference

| Script | What it does | Runs from |
|--------|--------------|-----------|
| `server/index.js` | Local backend; reads device directly for real-time local view | Office LAN |
| `server/set-device-cloud-domain.js` | Point device at `hrm.tcfbd.com` (+ DNS), backup & restart. `--restore` to revert | Office LAN |
| `server/read-device-options.js` | Read-only probe of device option keys | Office LAN |
| `server/set-device-option.js` | Write arbitrary option keys with read-back | Office LAN |
| `server/auto-sync.js` | Continuous 2-min device→live sync (backup path) | Office PC |
| `server/sync-to-live.js` | One-shot device→live bulk sync | Office LAN |
| `server/cleanup-device-users.js` | Delete unnamed/numeric users from device (`--dry-run` first) | Office LAN |

## ZKTeco command codes (reference)

| Const | Value | Purpose |
|-------|-------|---------|
| `CMD_OPTIONS_RRQ` | 11 | Read an option key |
| `CMD_OPTIONS_WRQ` | 12 | Write an option key |
| `CMD_REFRESHDATA` | 1013 | Refresh data table |
| `CMD_REFRESHOPTION` | 1014 | Apply written options |
| `CMD_RESTART` | 1004 | Restart device |
| `CMD_USER_WRQ` | 8 | Create/update user |
| `CMD_DELETE_USER` | 18 | Delete user |

---

## Observability & Hardening (production-grade ADMS)

The ADMS pipeline was made **observable, measurable, and race-safe** without
changing the architecture — no polling, no always-on service, no new data store.
All changes are in `php_server/index.php` plus one external script.

### Important: where attendance actually lives

The live ADMS receiver does **not** store attendance in MySQL. It writes to
**flat JSON files** in the PHP app dir, dedup-keyed in memory by
`deviceUserId|recordTime`:

| File | Contents |
|------|----------|
| `zkt_pushed_attendance.json` | all pushed punches (the attendance store) |
| `zkt_pushed_users.json` | pushed user list (names) |
| `zkt_device_lastseen.json` | last device contact (for health) |
| `zkt_device_log.json` | rolling last-60 request protocol trace |
| `zkt_latency.json` | rolling latency samples (**new**) |

Because there is no SQL table, "add a unique index / INSERT IGNORE" was
implemented as its **file-store equivalent**: the dedup key already makes inserts
idempotent, and every read-modify-write now runs under an **exclusive `flock`**
(`adms_locked_json_update()`) so two concurrent pushes — or a push racing the
`/api/zkt/sync` backfill — can never clobber the file and lose records.

### 1. End-to-end latency instrumentation

Every genuinely-new punch records three timestamps:

- **T0** = punch time from ATTLOG `field[1]`, parsed in device TZ → absolute epoch
- **T1** = request-received time (`REQUEST_TIME_FLOAT`)
- **T2** = commit time (after the locked write)

Stored per-sample in `zkt_latency.json` (bounded to `ADMS_LATENCY_MAX`):

```
transport_s = T1 − T0   → device push cadence + network   (the SLA-relevant number)
backend_ms  = T2 − T1   → server parse + dedup + commit
```

> **TZ-safe:** T0 is parsed with an explicit device offset (`+06:00`) and T1 is an
> absolute unix epoch, so the delta is correct no matter the PHP server's timezone.
> (Verified with the server forced to `America/New_York`.)
> **Caveat:** assumes device clock ≈ server clock (both NTP). A drifting device
> clock shows up as a constant offset in `transport_s` — itself a useful signal.

### 2. Health monitoring — `/api/zkt/adms-status`

Now returns an explicit `health` block and latency percentiles:

```jsonc
{
  "health": {
    "status": "healthy",          // healthy | stale | never_seen | clock_skew
    "last_seen_age_seconds": 12,
    "stale_threshold_seconds": 600,
    "in_business_hours": true,
    "alert": false                // true ⇒ stale DURING business hours ⇒ page someone
  },
  "latency": {
    "samples": 1423,
    "transport_seconds": { "p50": 6.1, "p95": 21.4, "p99": 44.0, "max": 91.2 },
    "backend_ms":        { "p50": 3.2, "p95": 7.8,  "p99": 14.1 },
    "sla_target_seconds": 30,
    "transport_p95_within_sla": true
  }
}
```

- **`?monitor`** → returns **HTTP 503** when `alert` is true, so an uptime monitor
  fires automatically. Plain `GET` (no `?monitor`) always returns 200 for the
  dashboard.
- "Stale" only alerts **during business hours** (`ADMS_BUSINESS_START..END`,
  device-local) — nobody punches overnight, so a quiet device at 3am isn't a page.

### 3. HTTP canary — `server/adms-canary.js`

Guards the one silent-failure mode: the HTTP-only device path getting force-
redirected to HTTPS. Run from cron / an uptime monitor:

```bash
node server/adms-canary.js            # exit 0 = healthy, exit 1 = ALERT
# */5 * * * *  node /path/server/adms-canary.js || <send alert>
```

It hits `http://hrm.tcfbd.com/iclock/cdata?SN=__CANARY__` over **plain HTTP**, does
**not** follow redirects, and FAILS if it sees a 301→https, a non-200, or a body
without `OK`. The reserved `__CANARY__` SN is answered by the receiver **without**
recording a device contact, so the canary never fools the health monitor.

### Config (env vars, all optional)

| Var | Default | Meaning |
|-----|---------|---------|
| `ADMS_DEVICE_TZ` | `+06:00` | device local offset for latency math |
| `ADMS_STALE_SECONDS` | `600` | no push within this ⇒ stale |
| `ADMS_BUSINESS_START` / `_END` | `8` / `20` | business-hours window (device-local hour) |
| `ADMS_SLA_SECONDS` | `30` | transport-latency SLA target |
| `ADMS_LATENCY_MAX` | `5000` | rolling latency-sample cap |
| `ADMS_CANARY_SN` | `__CANARY__` | reserved canary serial |

### How to read the metrics (the diagnosis flow)

After a few days of real traffic, `curl https://hrm.tcfbd.com/api/zkt/adms-status`:

- `latency.transport_seconds.p95 ≤ 30` → **SLA already met; change nothing.**
- `backend_ms.p95` high (>~50ms) → **backend** is the cost → the JSON file is
  getting large; that's the trigger to migrate the store to MySQL (below).
- `transport_seconds.p95` high & steady → **device firmware cadence** → the only
  lever is `Realtime=1` (already sent in the handshake — see review note).
- `transport_seconds` spiky with gaps → **network/DNS** → cross-check
  `recent_requests` for missing heartbeats.

### Code-review findings (ADMS protocol correctness)

| # | Finding | Action |
|---|---------|--------|
| 1 | File writes had no locking → concurrent pushes could lose records | **Fixed** — `flock` on all attendance/user/log writes |
| 2 | Duplicate re-pushes would have skewed latency stats | **Fixed** — only new punches are sampled |
| 3 | Canary would have polluted `device_last_seen` | **Fixed** — reserved-SN short-circuit |
| 4 | ACK format `OK: N` on POST, `text/plain`, handshake options | **Correct** — matches ZKTeco pushver; ACKs all received so the device never retry-loops |
| 5 | Handshake already sends `Realtime=1` + `TransInterval=1` | **Note** — near-real-time is already requested; little firmware headroom left |
| 6 | Handshake returns a static `ATTLOGStamp=9999` (no server-side stamp tracking) | **Left as-is** — safe because dedup catches any re-send; changing it on a working device risks a full re-push. Revisit only if traffic matters |
| 7 | Attendance store is an O(n) full-file rewrite per push (~JSON grows unbounded) | **Left as-is** — fine at 23 employees; **migrate to a MySQL `attendance` table** (unique key `(deviceUserId, recordTime)`, real `INSERT IGNORE`) if headcount/volume grows. This is the one genuine future architecture change |

### Deployment status — DEPLOYED 2026-07-13

`php_server/index.php` was deployed to live at **`hrm.tcfbd.com/api/index.php`** via
a surgical single-file FTP upload (NOT `deploy_now.js`, which clears the dir and
would wipe the runtime JSON data). Safety gate: the live file's SHA-256 matched the
repo HEAD baseline before upload, so the deploy added only the hardening delta.

Verified post-deploy: attendance record count unchanged (24,150 before & after — no
data loss), `/api/health` ok, `adms-status` now returns `health` + `latency`, and
`node server/adms-canary.js` passes at the real URL without polluting `device_last_seen`.

**Rollback (if ever needed):** the pre-deploy live file is exactly the committed
baseline, so revert by re-uploading the HEAD version:
```bash
git show HEAD:php_server/index.php > /tmp/index.baseline.php
# then FTP /tmp/index.baseline.php -> hrm.tcfbd.com/api/index.php
```

**Still TODO (operational, your infra):**
1. Schedule **`server/adms-canary.js`** on cron / an uptime monitor (office PC or
   a monitoring host): `*/5 * * * * node /path/server/adms-canary.js || <alert>`.
2. Point a monitor at `…/api/zkt/adms-status?monitor=1` (503 = page).
3. (Optional) set any of the ADMS_* env vars in cPanel.
4. After a few days, read `latency.transport_seconds.p95` — samples accrue on each
   real punch (heartbeats don't count).

> All changes were linted (`php -l`) and tested end-to-end against the real
> `index.php` (dedup, locking, latency capture, health states, canary isolation,
> `?monitor` 503) with a stubbed DB, plus timezone/percentile unit tests.

---

## What was done (mapped to commits)

| Commit | Work |
|--------|------|
| `923e8fd` | ADMS real-time push **receiver** + attendance fallback (live can load when device offline) |
| `323487d` | Load data when device offline, **cache ADMS user names** |
| `fe0e9be` | `adms-status` diagnostic endpoint |
| `33f4719` | Bulk `/api/zkt/sync` endpoint + `sync-to-live.js` |
| `cd5a28e` | `auto-sync.js` background service for office PC |
| `3e3cc89` | Deploy **iclock proxy** to primary domain via FTP |
| `89c682c` | Format node-zklib `recordTime` as **device-local ISO** in sync scripts |
| `b3b3470` | Remote **device cloud-config tools** + device last-seen tracking |
| `1921bc3` | Report **Cloud Push** connectivity in device status banner |
| `55a16a5` | **HTTPS-except-/iclock/** htaccess so HTTP-only device can push |
| `61b9008` | Parse ADMS `ATTLOG` DateTime from **field[1]** (was field[2]) |
