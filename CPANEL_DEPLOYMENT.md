# cPanel Deployment Guide - Step-by-Step

This guide provides a comprehensive, step-by-step walkthrough for deploying the Timesheet Management System to a cPanel server.

## Prerequisites
Before you begin, ensure you have:
1.  **cPanel Access** with the following features enabled:
    -   MySQL Database Wizard
    -   phpMyAdmin
    -   Setup Node.js App
    -   File Manager
2.  **Domain/Subdomain** ready (e.g., `hrm.tcfbd.com`).

---

## Phase 1: Database Setup

### Step 1: Create Database and User
1.  Log in to your cPanel.
2.  Search for and open **MySQL Database Wizard**.
3.  **Step 1: Create A Database**
    -   Enter a database name (e.g., `timesheet_db`).
    -   Click **Next Step**.
4.  **Step 2: Create Database Users**
    -   **Username:** Enter a username (e.g., `ts_user`).
    -   **Password:** Use the Password Generator to create a strong password. **COPY THIS PASSWORD AND SAVE IT.** You will need it later.
    -   Click **Create User**.
5.  **Step 3: Add User to Database**
    -   Check the box **ALL PRIVILEGES**.
    -   Click **Next Step** / **Make Changes**.
    -   *Note down the full database name and database username (often prefixed with your cPanel username, e.g., `cpaneluser_timesheet_db`).*

### Step 2: Import Database Schema
1.  Go back to the cPanel Dashboard.
2.  Open **phpMyAdmin**.
3.  In the left sidebar, click on the database you just created (`cpaneluser_timesheet_db`).
4.  Click the **Import** tab in the top menu.
5.  Click **Choose File**.
6.  Select the `server/schema.sql` file from your local project folder.
7.  Click **Go** at the bottom.
8.  *Verification:* You should see a success message and tables like `users`, `timesheets`, etc., appear in the left sidebar.

---

## Phase 2: Backend Deployment (Node.js)

### Step 1: Prepare Server Files Locally
1.  On your computer, navigate to the `server` folder inside your project.
2.  You need to create a ZIP file containing the backend code.
3.  **Select ONLY these files:**
    -   `index.js`
    -   `package.json`
    -   `package-lock.json`
    -   `db.js`
    -   `local_db.js`
    -   `local_data.json`
    -   `setup_db.js`
    -   `schema.sql`
4.  **DO NOT Select:**
    -   `node_modules` folder (we will install this on the server)
    -   `.env` file (we will set variables in cPanel)
5.  Right-click the selected files and choose **Compress to ZIP** (or specific options depending on your OS).
6.  Name the file `server_deploy.zip`.

### Step 2: Create Node.js Application
1.  In cPanel, open **Setup Node.js App**.
2.  Click **Create Application**.
3.  Fill in the details:
    -   **Node.js Version:** Select **18.x** or **20.x** (Recommended).
    -   **Application Mode:** **Production**.
    -   **Application Root:** `server` (This will create a folder named `hrm.tcfbd.com` in your home directory).
    -   **Application URL:** `server` (This determines the access path, e.g., `yourdomain.com/`).
    -   **Application Startup File:** `index.js`
4.  Click **Create**.
5.  *Wait for the application to start.* The virtual environment command will appear at the top given command copy it.

### Step 3: Upload Server Files
1.  In cPanel, open **File Manager**.
2.  Navigate to the `server` folder in your home directory (NOT inside `public_html`).
    -   *path usually looks like: `/home/youruser/server`*
3.  You will see some default files ensuring the folder exists.
4.  Click **Upload** in the top toolbar.
5.  Select and upload your `server_deploy.zip`.
6.  Go back to the `server` folder.
7.  Right-click `server_deploy.zip` and select **Extract**.
8.  Extract to the current folder (`/server`).
9.  **Important:** Ensure `package.json` and `index.js` are now directly visible in this folder.
10. Delete `server_deploy.zip` to save space.

### Step 4: Install Dependencies
1.  Go back to **Setup Node.js App** in cPanel.
2.  Click the **Edit** (Pencil icon) for your application if not already open.
3.  Scroll down to find the button **Run NPM Install**.
4.  Click it and wait for it to complete successfully.
    -   *If it fails, ensure `package.json` is in the Application Root folder.*

### Step 5: Configure Environment Variables
1.  In the **Setup Node.js App** screen, look for **Environment Variables**.
2.  Click **Add Variable** for each of the following:
    -   **Name:** `DB_HOST` | **Value:** `localhost`
    -   **Name:** `DB_USER` | **Value:** (The database user you created in Phase 1)
    -   **Name:** `DB_PASSWORD` | **Value:** (The password you saved in Phase 1)
    -   **Name:** `DB_NAME` | **Value:** (The database name from Phase 1)
    -   **Name:** `PORT` | **Value:** `3001` (Or let cPanel manage it, but defining it is safer)
3.  Click **Save**.
4.  **Restart the Application** (Click "Restart" button).

---

## Phase 3: Frontend Deployment (React/Vite)

### Step 1: Configure and Build Frontend
1.  **Check Configuration:**
    -   Open `vite.config.ts` in your project root.
    -   Ensure the `build` section has `outDir: 'dist'`:
        ```typescript
        build: {
          target: 'esnext',
          outDir: 'dist',
        },
        ```
    -   *If it is set to 'build', change it to 'dist' or remember to look for the 'build' folder instead.*

2.  **Prepare Environment:**
    -   Open your project in a terminal.
    -   Open or create the `.env` file in the root directory (NOT inside `src` or `server`).
    -   Ensure the API URL points to your cPanel backend:
    ```env
    VITE_API_URL=https://hrm.tcfbd.com/api
    ```
    *(Replace `your-domain.com` with your actual domain. The `/server` part comes from the "Application URL" set in Node.js setup).*
4.  Run the build cmd:
    ```bash
    npm run build
    ```
5.  This will create a `dist` folder in your project root.

### Step 2: Upload Frontend Files
1.  Located the `dist` folder on your computer.
2.  **Zip the CONTENTS of the `dist` folder.**
    -   Go *inside* `dist`.
    -   Select all files (`index.html`, `assets` folder, `vite.svg`...).
    -   Zip them into `frontend_deploy.zip`.
3.  In cPanel **File Manager**:
    -   Navigate to `public_html` (if deploying to main domain) OR your subdomain folder (e.g., `public_html/hrm`).
    -   **Upload** `frontend_deploy.zip`.
    -   **Extract** it here.
4.  You should now see `index.html` directly in your public folder.

### Step 3: Configure .htaccess (SPA Routing)
Since this is a Single Page App, we need to redirect all traffic to `index.html`.
1.  In **File Manager** (same folder where you uploaded frontend), look for a `.htaccess` file.
    -   *If hidden, click Settings (top right) -> Show Hidden Files.*
2.  If it doesn't exist, create a new file named `.htaccess`.
3.  Edit the file and paste this code:
    ```apache
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteCond %{REQUEST_FILENAME} !-l
      RewriteRule . /index.html [L]
    </IfModule>
    ```
4.  Save Changes.

---

## Phase 4: Final Verification
1.  Open your website URL (e.g., `https://hrm.tcfbd.com`).
2.  You should see the Login Screen.
3.  Log in with default credentials (if using seeded data) or register a new user if your app allows it.
4.  **Superadmin Master Key:**
    -   **Passkey:** `Superadmin@tcfadmin`
    -   *Note: This login is now hardcoded to ALWAYS work as a recovery key, even if other admins exist.*

## Troubleshooting
-   **"index.js not found"**: Check your specific Node.js App Root folder in File Manager. It must contain `index.js` and `package.json`.
-   **"Run NPM Install" Disabled/Greyed Out**: This means `package.json` is not found in the **Application Root**.
    -   **Fix:** Ensure your files (`package.json`, `index.js`, etc.) are *directly* inside the folder you set as the Application Root.
    -   If your files are inside a subfolder (e.g., `server/server/` or `hrm.tcfbd.com/server/`), **MOVE** them up one level to the main folder.
-   **White Screen on Frontend**: Check console errors (F12). If you see 404s for JS/CSS files, make sure you uploaded the *contents* of `dist`, not the folder `dist` itself.
-   **"dist" folder missing after build**: Check `vite.config.ts`. If `outDir` is set to `'build'`, look for a `build` folder instead.
-   **API Errors**: specific "Network Error" usually means `VITE_API_URL` is wrong or the Backend is not running. Check cPanel "Setup Node.js App" status.
