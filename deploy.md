# Deployment & CI/CD Documentation

This document explains the deployment setup for the Timesheet Management System at `hrm.tcfbd.com`, including credentials, the CI/CD pipeline, and a changelog of all deployments.

---

## 1. Credentials

**cPanel Login Details:**
- **URL:** https://b216.serverdiana.com:2083/
- **Username:** `tcfbdcom`
- **Password:** `KJJH*uy^5rt4@y2`
- **FTP Server:** `b216.serverdiana.com`

**Database Details:**
- **Database Name:** `tcfbdcom_hrm`
- **Database User:** `tcfbdcom_hrm`
- **Database Password:** `iYC.H5C0rxp&b%Wu`

---

## 2. GitHub Repository

- **Repo:** https://github.com/Dibbotcf/Timesheetmanagementsystem
- **Deploy Branch:** `main`
- **GitHub Actions:** https://github.com/Dibbotcf/Timesheetmanagementsystem/actions

---

## 3. CI/CD Pipeline (GitHub Actions) — ✅ FULLY OPERATIONAL

> **Status as of 4 Jun 2026:** All GitHub Secrets are configured and the pipeline is live. Every push to `main` automatically builds and deploys to cPanel.

### How It Works
1. Push code to the `main` branch on GitHub.
2. GitHub Actions triggers automatically.
3. It runs `npm install` → `npm run build` (Vite production build).
4. Prepares the deployment folder: `dist/` + `php_server/` (as `api/`) + production `.env`.
5. Uploads all files to `hrm.tcfbd.com/` via FTP using `SamKirkland/FTP-Deploy-Action`.

### GitHub Secrets (All Configured ✅)

| Secret Name   | Value                   | Purpose                      |
|---------------|-------------------------|------------------------------|
| `FTP_SERVER`  | `b216.serverdiana.com`  | cPanel FTP host              |
| `FTP_USERNAME`| `tcfbdcom`              | cPanel FTP username          |
| `FTP_PASSWORD`| `KJJH*uy^5rt4@y2`       | cPanel FTP password          |
| `DB_USER`     | `tcfbdcom_hrm`          | MySQL database username      |
| `DB_PASSWORD` | `iYC.H5C0rxp&b%Wu`      | MySQL database password      |
| `DB_NAME`     | `tcfbdcom_hrm`          | MySQL database name          |

> To update secrets: Go to **GitHub Repo → Settings → Secrets and variables → Actions**.

### Workflow File
Located at: `.github/workflows/deploy.yml`

```yaml
name: Deploy to cPanel

on:
  push:
    branches:
      - main

jobs:
  web-deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
    - name: Get latest code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install Dependencies
      run: npm install

    - name: Build React App
      run: npm run build
      env:
        VITE_API_URL: "https://hrm.tcfbd.com/api"

    - name: Prepare Deployment Folder
      run: |
        mkdir deployment
        cp -r dist/* deployment/
        mkdir -p deployment/api
        cp -r php_server/* deployment/api/
        echo "VITE_API_URL=https://hrm.tcfbd.com/api" > deployment/.env
        echo "DB_HOST=localhost" >> deployment/.env
        echo "DB_USER=${{ secrets.DB_USER }}" >> deployment/.env
        echo "DB_PASSWORD=${{ secrets.DB_PASSWORD }}" >> deployment/.env
        echo "DB_NAME=${{ secrets.DB_NAME }}" >> deployment/.env

    - name: Sync files to cPanel FTP
      uses: SamKirkland/FTP-Deploy-Action@v4.3.4
      with:
        server: ${{ secrets.FTP_SERVER }}
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        server-dir: hrm.tcfbd.com/
        local-dir: ./deployment/
```

---

## 4. React SPA Routing Fix (.htaccess)

A `.htaccess` file lives in `public/` to fix 404 errors on page refresh in Apache:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 5. How to Deploy (Standard Workflow)

```bash
# 1. Make your code changes locally
# 2. Stage and commit
git add <changed files>
git commit -m "your commit message"

# 3. Push to main — GitHub Actions handles the rest automatically
git push origin main
```

Check deployment progress at: https://github.com/Dibbotcf/Timesheetmanagementsystem/actions

---

## 6. Deployment Changelog

| Date         | Commit      | Description                                                                                     |
|--------------|-------------|-------------------------------------------------------------------------------------------------|
| 4 Jun 2026   | `ee6b075`   | feat(timesheet): OT hours in date rows, auto-fill HR Comments (Row 07 & 09), fix last working day calculation using prev month template |
| *(earlier)*  | `1024eda`   | Initial CI/CD pipeline setup, database import, FTP upload, SPA routing fix                     |
