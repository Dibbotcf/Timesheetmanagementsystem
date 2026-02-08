# cPanel Deployment Guide (PHP & MySQL)

**Domain**: `https://hrm.tcfbd.com/`

This guide allows you to deploy the application manually without using terminal commands on the server. Follow every step exactly.

## 0. Prerequisites
-   You have the `.zip` files prepared on your computer:
    -   `frontend_build.zip` (Contents of `dist` folder)
    -   `backend_api.zip` (Contents of `php_server` folder)

## 1. Database Setup (cPanel)

1.  Log in to **cPanel**.
2.  Go to **Databases** -> **MySQL Database Wizard**.
3.  **Step 1: Create A Database**
    -   Name: `hrm` (Result: `tcfbdcom_hrm`)
    -   Click **Next Step**.
4.  **Step 2: Create Database Users**
    -   Username: `hrm` (Result: `tcfbdcom_hrm`)
    -   Password: `-49y[!.^P8..p?aJ`
    -   Click **Create User**.
5.  **Step 3: Add User to Database**
    -   Check the box **ALL PRIVILEGES**.
    -   Click **Next Step**.
6.  **Import Tables**:
    -   Go to cPanel home -> **phpMyAdmin**.
    -   Click the database `tcfbdcom_hrm` on the left sidebar.
    -   Click the **SQL** tab at the top.
    -   Paste the content of your local `server/schema.sql` file.
    -   Click **Go**.

## 2. File Upload & Locations (File Manager)

This is the most critical part. We will place files in `public_html`.

1.  Go to cPanel -> **File Manager**.
2.  Navigate to `public_html`. (If your domain is a subdomain, navigate to the specific folder for `hrm.tcfbd.com`).

### A. Upload Frontend
1.  Inside the web root folder, click **Upload**.
2.  Select `frontend_build.zip`.
3.  Go back to File Manager.
4.  Right-click `frontend_build.zip` -> **Extract**.
5.  **Critical**: Make sure the **files** (like `index.html`, `assets/`) are directly in `public_html`.
    -   *If they extracted into a subfolder (like `dist`), go into that folder, Select All, and **Move** them UP to `public_html`.*

### B. Upload Backend (The /api Location)
1.  Inside `public_html`, create a **New Folder** named `api`.
2.  Double-click `api` to enter it.
3.  Click **Upload**.
4.  Select `backend_api.zip`.
5.  Go back.
6.  Right-click `backend_api.zip` -> **Extract**.
7.  **Check**: You should see `index.php` and `db.php` **inside** this `api` folder.

### C. Create Environment File (.env)
1.  Navigate back to `public_html` (the main folder).
2.  Click **+ File** (New File).
3.  Name it: `.env` (starts with a dot).
    -   *If you don't see it after creating, click **Settings** (top right) -> Check **Show Hidden Files**.*
4.  Right-click `.env` -> **Edit**.
5.  Paste the following configuration:
    ```env
    VITE_API_URL=https://hrm.tcfbd.com/api
    DB_HOST=localhost
    DB_USER=tcfbdcom_hrm
    DB_PASSWORD=-49y[!.^P8..p?aJ
    DB_NAME=tcfbdcom_hrm
    ```
6.  Click **Save Changes**.

---

## 3. Final Folder Structure Check

Compare your File Manager to this list. If it looks different, specific features will fail.

```text
public_html/                 <-- Root for hrm.tcfbd.com
├── .env                     <-- YOUR DATABASE PASSWORDS (Created in Step 2C)
├── index.html               <-- Frontend Entry (From frontend_build.zip)
├── assets/                  <-- Frontend Assets
├── vite.svg
│
└── api/                     <-- Backend Folder (Created in Step 2B)
    ├── .htaccess            <-- Critical for routing
    ├── index.php            <-- Main API logic
    ├── db.php               <-- Database connector
    ├── routes.php           <-- (If applicable)
    └── vendor/              <-- PHP Dependencies
```

---

## 4. Testing

1.  **Frontend Load**: Visit `https://hrm.tcfbd.com/`.
    -   **Success**: You see the login page.
    -   **Fail**: You see a directory listing or 404. -> *Check Step 2A (Frontend Location).*

2.  **API Health**: Visit `https://hrm.tcfbd.com/api/health`.
    -   **Success**: `{"status":"ok","timestamp":"..."}`
    -   **Fail (404)**: -> *Check Step 2B (Backend Location).*
    -   **Fail (500)**: -> *Check Step 2C (.env credentials) or DB User Permissions.*

3.  **Login**: Try logging in with `Superadmin@tcfadmin`.
