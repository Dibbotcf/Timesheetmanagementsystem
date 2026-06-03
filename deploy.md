# Deployment & CI/CD Documentation

This document explains the steps taken to successfully deploy the Timesheet Management System to the live cPanel server (`hrm.tcfbd.com`), including the database import, routing fixes, and the setup of the automated GitHub Actions CI/CD pipeline.

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

## 2. Initial Manual Deployment & Database Sync

To get the site live immediately without waiting for GitHub Actions secrets to be configured, the following steps were performed manually via automated local scripts:

1. **Building the App:** The React frontend was built locally using `npm run build` to generate the static `dist/` folder.
2. **Environment Configuration:** A production `.env` file was dynamically generated containing the database credentials above and the live API URL (`https://hrm.tcfbd.com/api`).
3. **Database Import:** 
   - A custom PHP script (`import_db.php`) was created.
   - This script and the SQL dumps (`kv_store.sql` and `backups.sql`) were uploaded to the cPanel server via FTP.
   - The script was executed via a web request to securely inject the 168 rows of data into the `tcfbdcom_hrm` database.
   - The script automatically deleted itself and the SQL files afterward for security.
4. **FTP Upload:** The entire `dist/` folder, the `php_server/` folder (renamed to `api/`), and the `.env` file were uploaded via a Node.js FTP script directly to the `hrm.tcfbd.com` directory on cPanel.

---

## 3. Fixing the React SPA Routing (404 Error on Refresh)

A common issue with React Single Page Applications on Apache servers is that refreshing the page (e.g., `https://hrm.tcfbd.com/templates`) results in a 404 Not Found error. This happens because the server looks for a literal folder named `templates`, rather than passing the route to React.

**The Fix:**
An `.htaccess` file was created in the `public/` directory with the following Rewrite rules:
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
This forces the server to redirect all requests for non-existent files/folders back to `index.html`, allowing React Router to handle the URL correctly. This file is now permanently part of the codebase.

---

## 4. GitHub Actions CI/CD Pipeline Setup

To ensure future updates are automatically deployed, a CI/CD pipeline was created in `.github/workflows/deploy.yml`.

### How It Works:
1. Whenever code is pushed to the `main` branch on GitHub, the pipeline triggers.
2. It automatically runs `npm install` and `npm run build` to compile the React code.
3. It creates the production deployment folder and generates the production `.env` file securely using GitHub Secrets.
4. It uses the `SamKirkland/FTP-Deploy-Action` to automatically upload the updated files to `hrm.tcfbd.com` on your cPanel.

### IMPORTANT: Required GitHub Secrets
For the automated pipeline to work on future updates, you must add your FTP credentials to your GitHub repository securely. 
1. Go to your repository on GitHub.
2. Navigate to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret** and add the following three secrets:
   - **Name:** `FTP_PASSWORD` | **Secret:** `KJJH*uy^5rt4@y2`
   - **Name:** `FTP_USERNAME` | **Secret:** `tcfbdcom`
   - **Name:** `FTP_SERVER`   | **Secret:** `b216.serverdiana.com`
