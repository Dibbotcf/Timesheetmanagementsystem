# Deployment Guide

---

## How to Deploy

### One time, ever

```bash
gh auth login        # GitHub.com -> HTTPS -> login with a web browser
gh auth setup-git    # git uses that token from now on; no popups, any shell
```

Verify:

```bash
gh auth status                                             # "Logged in to github.com as Dibbotcf"
git config --get-all credential.https://github.com.helper  # should list gh
```

### Every time after that

```bash
npm run deploy
```

That is the whole release. Track it at
https://github.com/Dibbotcf/Timesheetmanagementsystem/actions

**Typical deploy time: 3-5 minutes** (often under 90 s).

`npm run deploy` ([scripts/deploy.mjs](../scripts/deploy.mjs)):

1. **Refuses to run off `main`** - CI only deploys `main`.
2. **Refuses if build-affecting files are uncommitted** (`src/`, `php_server/`, `public/`,
   `index.html`, `package.json`, `vite.config`). Edits under `DD files/` are ignored, so
   notes never block a release.
3. **Builds locally first** - a broken build fails on your machine in seconds instead of
   four minutes into CI.
4. **Pushes to `main`**, triggering the pipeline. On an auth failure it names the fix
   instead of dumping a git stack trace.
5. **Polls live until the served bundle hash matches your local build.** This is the step
   that matters: proof the deploy *landed*, not merely that CI went green.
6. **Runs the ZKT canary** - fails loudly if `http://hrm.tcfbd.com/iclock/cdata` stops
   returning 200, warns if `/dashboard` stops redirecting to HTTPS.

Doing it by hand instead is still just:

```bash
git add src/... php_server/... package.json
git commit -m "fix: description"
git push origin main
```

### Why the one-time `gh` setup is needed

Deployment itself has always worked - `.github/workflows/deploy.yml` runs on any push to
`main`. What broke on **31 Aug 2026** was authentication at the `git push` step:

- Git Credential Manager authenticates by opening a **GUI window**. A non-interactive
  shell (Claude Code, CI, SSH, any headless terminal) has no desktop session, so the
  window cannot render. GCM reports `fatal: User cancelled dialog` **instantly**, then
  falls back to a terminal prompt and finds no TTY either.
- Windows Credential Manager *did* hold a `git:https://github.com` entry for `Dibbotcf`,
  but the token had **expired**. GCM tried to refresh it **interactively** - which is
  exactly what was impossible.

A stale token silently converted a background operation into one needing a human click.
`gh auth setup-git` replaces GCM with `gh` for github.com; `gh` stores a long-lived token
and hands it over non-interactively, so pushes work from any shell.

**The symptom to remember:** the Mobile Allowance fix looked "not deployed" for several
rounds when in truth the push had never succeeded. CI going green was never the thing
worth checking - what the browser actually downloads is. That is why step 5 exists.

### If `npm run deploy` fails

| Message | Meaning | Fix |
|---|---|---|
| `git push could not authenticate` | token expired or `gh` not set up | rerun the two `gh` commands above |
| `Live still serving <old>, expected <new>` | CI failed or is slow | check [Actions](https://github.com/Dibbotcf/Timesheetmanagementsystem/actions) |
| `/iclock returned 301` | Force-HTTPS back ON, or `.htaccess` lost | see the ZKT section below |

---

## What the Pipeline Does

1. Checks out code on `ubuntu-latest`
2. Installs Node.js 20
3. Runs `npm install`
4. Runs `npm run build` → creates `dist/`
5. Assembles deployment folder:
   - `dist/*` → root of server
   - `php_server/*` → `api/` folder
   - Injects production `.env` with DB credentials
6. FTP uploads everything to `hrm.tcfbd.com/` via `SamKirkland/FTP-Deploy-Action`

> **Note:** The GitHub PAT does not have `workflow` scope — `.github/workflows/deploy.yml` cannot be pushed via the PAT. Edit it locally and ask Dibbo to push from a token with workflow scope, or use the GitHub UI editor.

> **KNOWN BUG (dotfiles):** The pipeline step `cp -r dist/* deployment/` uses bash `*`, which does **not** match hidden files — so `.htaccess` is silently dropped from every deploy. Same for `php_server/.htaccess`. Both are maintained on the server manually via FTP. **This is why the two `.htaccess` files carry the critical HTTPS-except-/iclock/ logic that must never be lost.** If either changes in the repo, re-upload manually:
> ```bash
> # root .htaccess (HTTPS force + iclock exception + SPA)
> curl -T "public/.htaccess"     "ftp://b216.serverdiana.com/hrm.tcfbd.com/.htaccess"     --user 'tcfbdcom:PASSWORD'
> # api .htaccess (HTTPS force + iclock exception via THE_REQUEST)
> curl -T "php_server/.htaccess" "ftp://b216.serverdiana.com/hrm.tcfbd.com/api/.htaccess" --user 'tcfbdcom:PASSWORD'
> ```
> After uploading, verify: `http://hrm.tcfbd.com/iclock/cdata?SN=TEST` must return **200** (handshake), and `http://hrm.tcfbd.com/dashboard` must **301** to HTTPS.
> Permanent fix (needs workflow-scope PAT or GitHub web editor): change `cp -r dist/* deployment/` to `cp -r dist/. deployment/` and `cp -r php_server/* deployment/api/` to `cp -r php_server/. deployment/api/` in `.github/workflows/deploy.yml`. **But if you fix the CI to deploy `.htaccess`, make sure the repo copies are the HTTPS-except-/iclock/ versions, or CI will overwrite the working config and break device push.**

---

## Hotfix Deploy — single file (surgical), and what NEVER to run

The `api/` folder on the server holds **runtime data that is NOT in the repo**:
`zkt_pushed_attendance.json` (~1.4 MB — the entire attendance history), `zkt_pushed_users.json`,
`zkt-time-overrides.json` (manual time edits), `zkt_latency.json`, device logs.
**Any deploy that clears/mirrors that folder destroys this data.**

### ⛔ NEVER run `deploy_now.js`
It calls `client.clearWorkingDir()` on `hrm.tcfbd.com/` then re-uploads — which **wipes all the
runtime JSON data** (all attendance + your time edits). It was a one-time initial-deploy script and
is **not safe for updates**. (This is why the ADMS hardening was pushed as a single file, not with it.)

### ✅ To hotfix ONE PHP file (e.g. `php_server/index.php`)
Upload just that file over FTP — every runtime JSON file is left untouched:
```bash
# 1) SAFETY GATE — download the live file, confirm it matches the repo baseline first:
#    live sha256  ==  `git show HEAD:php_server/index.php | sha256sum`   → safe to overwrite
# 2) upload the single file:
curl -T "php_server/index.php" "ftp://b216.serverdiana.com/hrm.tcfbd.com/api/index.php" --user 'tcfbdcom:PASSWORD'
# 3) verify — data intact + endpoint healthy:
curl -s https://hrm.tcfbd.com/api/zkt/adms-status   # attendance count unchanged; health block present
```
This is how the ADMS hardening (commit `af89234`) went live on 13 Jul 2026 — `index.php` only, with
**24,150 attendance records unchanged before/after**. Rollback = re-upload `git show HEAD:php_server/index.php`.

> The `.htaccess` files (below) are also single-file manual FTP uploads for the same reason.

---

## GitHub Secrets (All Configured)

| Secret | Purpose |
|--------|---------|
| `FTP_SERVER` | cPanel FTP host (`b216.serverdiana.com`) |
| `FTP_USERNAME` | FTP username (`tcfbdcom`) |
| `FTP_PASSWORD` | FTP password (see cPanel) |
| `DB_USER` | Production DB user (`tcfbdcom_hrm`) |
| `DB_PASSWORD` | Production DB password (see cPanel) |
| `DB_NAME` | Production DB name (`tcfbdcom_hrm`) |

To update: **GitHub Repo → Settings → Secrets and variables → Actions**

---

## What Gets Deployed vs What Stays Local

| Deployed to Production | Local Only (not deployed) |
|----------------------|--------------------------|
| `dist/` (built React app) | `server/` (Node.js dev backend) |
| `php_server/` → `api/` | `node_modules/` |
| `.htaccess` (from `public/`) | `DD files/` |
| Production `.env` (injected by CI) | `server/.env` |
| | `unnecessary/` |
| | `primary_domain/` *(manual FTP — see below)* |

---

## SPA Routing + API Passthrough (.htaccess)

`public/.htaccess` is bundled into `dist/` by Vite and deployed automatically:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  # Pass API requests through to the PHP backend
  RewriteCond %{REQUEST_URI} ^/api/ [NC]
  RewriteRule ^ - [L]
  # Route ZKTeco device ADMS push (/iclock/*) to PHP backend
  RewriteRule ^iclock/(.*)$ api/index.php [QSA,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## ZKT ADMS Push — RESOLVED (13 Jul 2026): real-time push working

**TRUE ROOT CAUSE (found 13 Jul 2026):** The ZKTeco F18 speaks **plain HTTP/1.1 on port 80** and cannot follow HTTP redirects or negotiate TLS. cPanel's **"Force HTTPS Redirect"** was ON for hrm.tcfbd.com, issuing a vhost-level `301 http→https` for every request. So the device connected, received a 301, and gave up — every time, since day one. The redirect fired at the Apache vhost level, *before* the DocumentRoot `.htaccess` ran, so no `.htaccess` rule could override it, and the PHP `device_last_seen` tracker never fired (PHP never ran). Earlier "it works" tests were all done over `https://` and were therefore meaningless — the device only ever uses `http://`.

**THE FIX (all applied, verified):**
1. **Disabled cPanel Force HTTPS Redirect** for hrm.tcfbd.com via UAPI (no UI login needed):
   ```bash
   curl -k -u 'tcfbdcom:PASSWORD' \
     "https://b216.serverdiana.com:2083/execute/SSL/toggle_ssl_redirect_for_domains?domains=hrm.tcfbd.com&state=0"
   # -> {"status":1,"data":["hrm.tcfbd.com"]}  (Apache rebuild takes ~1-2 min)
   ```
   This setting is **server-side state, not in the repo** — if the site is ever migrated or the toggle is re-enabled, real-time push breaks again. Keep it OFF.

   **Auto-detection (added 13 Jul 2026):** this regression is now caught within ~5 min. A cPanel cron
   canary and `adms-status?monitor=1` email **dibbo.tcfbd@gmail.com** on failure (health goes `stale`,
   canary reports *"redirected to HTTPS"*). It **recurred on 13 Jul 2026** when the toggle was switched
   back ON — the canary caught the `301` and the device stopped pushing within 10 min. Manual check:
   ```bash
   node server/adms-canary.js       # exit 1 = broken
   curl -sD- -o/dev/null --max-redirs 0 "http://hrm.tcfbd.com/iclock/cdata?SN=__CANARY__"  # must be 200, not 301
   ```
   **Fix if it happens again:** turn Force HTTPS Redirect OFF for hrm.tcfbd.com (cPanel → Domains), or:
   ```bash
   curl -k -u 'tcfbdcom:PASSWORD' "https://b216.serverdiana.com:2083/execute/SSL/toggle_ssl_redirect_for_domains?domains=hrm.tcfbd.com&state=0"
   ```
   Then backfill any punches missed during the outage: `node server/sync-to-live.js`.
2. **Root `.htaccess`** (`public/.htaccess`) now re-forces HTTPS for every path **except** `/iclock/`, so real users stay on HTTPS while the device's push path stays on HTTP. No security downgrade.
3. **API `.htaccess`** (`php_server/.htaccess`) also forces HTTPS, excluding `/iclock/` via `THE_REQUEST` (survives the internal rewrite of `/iclock/` → `api/index.php`).
4. **Device config** (written remotely over LAN via `server/set-device-option.js`): `ICLOCKSVRURL=hrm.tcfbd.com`, `WebServerPort=80`, `DNS=8.8.8.8`, plus **Enable Domain Name = ON** (toggled physically at the device).

**Verified working:** device serial `CGT9214460372` (pushver 2.4.0) pushes each punch in real time via `POST /iclock/cdata?table=ATTLOG` over HTTP. Status banner shows "Device Connected · Cloud Push".

**Second bug fixed same day — ATTLOG parser field index:** the ADMS ATTLOG record is `PIN \t DateTime \t Status \t Verify \t WorkCode \t ...` — **DateTime is field[1], not field[2]**. The handler was reading field[2] (Status="0"), saving every punch as `recordTime="0"` (dropped by the report) and collapsing all punches to one dedup key, so the device got `OK: 0` and retried endlessly. Fix: read field[1] with a datetime-pattern guard, and ACK the RECEIVED count (`OK: <n>`) so duplicates don't loop. Verified by replaying a real device POST → records saved with correct timestamps.

**The bare-IP / primary-domain proxy approach was a dead end** (bare IP `103.169.161.66` hits cPanel's default placeholder vhost). `primary_domain/iclock/` files are obsolete — kept only for history. Do NOT rely on them.

**Fallback if push ever stops:** `node server/auto-sync.js` on the office PC still works as a bridge. Historical backfill: `node server/sync-to-live.js`.

---

## Deployment Changelog

| Date | Commit | Description |
|------|--------|-------------|
| 22 Sep 2026 | — | **feat(leaves):** no-default leave-type tiles + casual criteria + mandatory sick evidence (PDF/image ≤5 MB); printable A4 Leave Request Form page (`/leave/:id/view`, edit/print/PDF); hard-copy deadline now counts from leave end date using month-template off-days; auto monthly Records folders with signed-form/supporting-doc uploads (`leave_files` KV items) and bulk merged-PDF download (pdf-lib); Pending Leaves + Records redesigned to the HR reference style. Backend: `restore` now replaces only backed-up collections (was truncating `issues`/`attendance`); Node JSON limit 25 MB. |
| 13 Jul 2026 | — | Force-HTTPS **re-enabled by mistake** → device push broke again; canary detected the `301`, health `stale`. Fix = toggle OFF. (Validated the monitoring works.) |
| 13 Jul 2026 | — | **Monitoring live:** 2 cPanel cron jobs (device-down + iclock canary) email dibbo.tcfbd@gmail.com on failure. Backfilled 1 dropped punch (Md. Showkat Akber 09:03) via `sync-to-live.js`. |
| 13 Jul 2026 | `af89234` | **feat(zkt): ADMS hardening** — flock-safe writes, T0/T1/T2 latency metrics, health + `?monitor` 503 in `adms-status`, canary guard. Deployed **single-file** (`index.php` only); 24,150 records intact before/after. Verified sub-second transport latency. |
| 13 Jul 2026 | — | **ROOT CAUSE FIXED:** disabled cPanel Force-HTTPS (device is HTTP-only); root+api `.htaccess` re-force HTTPS except `/iclock/`. Device `CGT9214460372` now pushes real-time over HTTP ADMS. |
| 12 Jul 2026 | — | Manual FTP: uploaded root `.htaccess` (CI dotfile bug); ran sync-to-live.js — 24,131 records + 23 users now live |
| 12 Jul 2026 | `20ce690` | revert: restore workflow (PAT lacks workflow scope) |
| 12 Jul 2026 | `3e3cc89` | feat(zkt): deploy iclock proxy to primary domain |
| 12 Jul 2026 | `cd5a28e` | feat(zkt): auto-sync background service for office PC |
| 12 Jul 2026 | `33f4719` | feat(zkt): add bulk sync endpoint + sync-to-live script |
| 12 Jul 2026 | `fe0e9be` | fix(zkt): add adms-status diagnostic endpoint |
| 12 Jul 2026 | `323487d` | fix(zkt): load data when device offline, cache ADMS user names |
| 12 Jul 2026 | `923e8fd` | fix(zkt): remove numeric users from attendance report |
| 10 Jul 2026 | — | ZKTeco PHP TCP rewrite, ADMS push receiver, .htaccess API fix, Superadmin role fix |
| 01 Jul 2026 | `918f897` | feat(ui): OT report redesign, saved records view, issues page redesign |
| 01 Jul 2026 | `737eaa5` | fix: sick leave UTC timezone bug, HR Comments date remarks, OT Summary PDF |
| (earlier) | `252e379` | fix(timesheet): UTC timezone bug, HR Comments date remarks |
| (earlier) | `b666015` | fix(ot): update submittedAt when modifying OT claim |
| (earlier) | `a58325e` | style(reports): truncate OT text |
| (earlier) | `51c13e5` | feat(ot): replace Time In/Out with Submission Time |
| 04 Jun 2026 | `ee6b075` | feat(timesheet): OT hours in date rows, auto-fill HR Comments rows 07 & 09 |
| (initial) | `1024eda` | Initial CI/CD pipeline setup, database import, FTP upload, SPA routing fix |
