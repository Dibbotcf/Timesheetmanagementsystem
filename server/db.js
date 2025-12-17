const mysql = require('mysql2/promise');
const localDb = require('./local_db');
require('dotenv').config();

const USE_MYSQL = process.env.USE_MYSQL === 'true';

if (!USE_MYSQL) {
    console.log('--- RUNNING IN LOCAL FILE MODE ---');
    console.log('To use MySQL, set USE_MYSQL=true in .env');
    module.exports = {
        ...localDb,
        pool: {
            query: async () => { throw new Error("MySQL Pool not available in Local Mode"); },
            execute: async () => { throw new Error("MySQL Pool not available in Local Mode"); }
        }
    };
} else {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'timesheet_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    async function get(key) {
        const [rows] = await pool.execute('SELECT value FROM kv_store WHERE `key` = ?', [key]);
        if (rows.length > 0) {
            return typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        }
        return null;
    }

    async function set(key, value) {
        const jsonValue = JSON.stringify(value);
        await pool.execute(
            'INSERT INTO kv_store (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
            [key, jsonValue, jsonValue]
        );
    }

    async function del(key) {
        await pool.execute('DELETE FROM kv_store WHERE `key` = ?', [key]);
    }

    async function getByPrefix(prefix) {
        const [rows] = await pool.execute('SELECT value FROM kv_store WHERE `key` LIKE ?', [`${prefix}%`]);
        return rows.map(row => {
            return typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        });
    }

    module.exports = { get, set, del, getByPrefix, pool };
}
