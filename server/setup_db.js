const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'timesheet_db'}`);
        console.log('Database created or exists.');

        await connection.end();

        // now use pool from db.js (which uses the DB_NAME) to create tables
        const { pool } = require('./db');
        const fs = require('fs');
        const path = require('path');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        // Split by semi-colon to run multiple statements (mysql2 execute doesn't support multiple stats by default unless configured)
        // actually pool.query allows multiple statements if multipleStatements: true in config.
        // My config didn't have it. Let's just run them one by one roughly or just use a raw connection with multipleStatements.

        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'timesheet_db',
            multipleStatements: true
        };

        const dbConn = await mysql.createConnection(dbConfig);
        await dbConn.query(schema);
        console.log('Schema imported.');
        await dbConn.end();
        process.exit(0);

    } catch (err) {
        console.error('Setup failed:', err.message);
        process.exit(1);
    }
}

setup();
