# Local Development Setup Guide

This guide explains how to run the Timesheet Management System on your local machine for development or testing.

## Prerequisites
Ensure you have the following installed:
1.  **Node.js** (v18 or higher): [Download Here](https://nodejs.org/)
2.  **MySQL Database**:
    -   You can use **XAMPP** (easiest for Windows): [Download Here](https://www.apachefriends.org/)
    -   Or **MySQL Community Server** & **Workbench**.
3.  **Git** (Optional, to clone the repo).

---

## Step 1: Database Setup

### Using XAMPP (Recommended)
1.  Open **XAMPP Control Panel**.
2.  Start **Apache** and **MySQL**.
3.  Click **Admin** next to MySQL to open **phpMyAdmin**.
4.  Click **New** in the sidebar.
5.  Create a database named `timesheet_db`.
6.  Click on the new database.
7.  Go to the **Import** tab.
8.  Choose the file `server/schema.sql` from the project folder.
9.  Click **Go**.

### Using MySQL Workbench
1.  Open MySQL Workbench and connect to your local instance.
2.  Run the query: `CREATE DATABASE timesheet_db;`.
3.  Open the `server/schema.sql` file in Workbench and execute it to create tables.

---

## Step 2: Backend Setup (Server)

1.  Open your terminal / command prompt.
2.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Configure Environment Variables:
    -   Create a file named `.env` in the `server` folder.
    -   Add the following specific to your local DB credentials:
    ```env
    PORT=3001
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=timesheet_db
    ```
    *(Note: Default XAMPP MySQL user is `root` with no password. If you set a password, add it here).*

5.  Start the Backend Server:
    ```bash
    npm start
    ```
    -   You should see: `Server running on port 3001` and `Connected to MySQL database`.

---

## Step 3: Frontend Setup (Client)

1.  Open a **new** terminal window (keep the server terminal running).
2.  Navigate to the project root directory (where `vite.config.ts` is):
    ```bash
    cd /path/to/Timesheetmanagementsystem-main
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Configure Environment Variables:
    -   Create a file named `.env` in the root directory.
    -   Add the API URL pointing to your local backend:
    ```env
    VITE_API_URL=http://localhost:3001/api
    ```
5.  Start the Development Server:
    ```bash
    npm run dev
    ```
6.  Open the link shown in the terminal (usually `http://localhost:5173`) in your browser.

---

## Step 4: Login and Testing

1.  The login screen should appear.
2.  If the database was empty, try the fallback Superadmin login:
    -   **Email:** `Superadmin@tcfadmin`
    -   **Password:** `admin123` (or check `src/utils/auth.ts` logic if changed)
3.  Once logged in, go to **Settings** -> **User Management** to create real admin/user accounts.

## Troubleshooting

-   **Backend Connection Error:** Ensure the `server` terminal is running and shows "Connected to MySQL".
-   **Database Error:** Double-check `.env` in `server` folder. `DB_USER` and `DB_PASSWORD` must match your local MySQL setup.
-   **CORS Error:** If you see "Access-Control-Allow-Origin" errors, ensure `cors` is enabled in `server/index.js` (it is by default).
