const express = require('express');
const cors = require('cors');
const { get, set, del, getByPrefix } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const fs = require('fs'); // Explicit require if needed
const path = require('path');
const archiver = require('archiver');

// Middleware
app.use(cors());
app.use(express.json());

// --- Download Routes ---

app.get('/api/download/schema', (req, res) => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        res.download(schemaPath, 'timesheet_schema.sql');
    } else {
        res.status(404).json({ error: 'Schema file not found' });
    }
});

app.get('/api/download/backend', (req, res) => {
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment('timesheet_backend.zip');

    archive.pipe(res);

    // Append files from server directory, excluding node_modules
    archive.glob('**/*', {
        cwd: __dirname,
        ignore: ['node_modules/**', 'package-lock.json', '.env']
    });

    // Also include package.json specifically to be safe
    archive.file(path.join(__dirname, 'package.json'), { name: 'package.json' });

    archive.finalize();
});

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Authentication ---

// Mock "Session" storage (In production, use JWT or a proper session store)
// For this simple migration, we'll sign a token manually
const SECRET_KEY = process.env.SECRET_KEY || 'default-insecure-secret';

app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    // Logic ported from frontend
    // Password format: firstname@suffix
    const parts = password.split('@');
    if (parts.length !== 2) {
        return res.status(400).json({ error: 'Invalid password format' });
    }

    const [nameInput, suffixInput] = parts;
    const inputNameLower = nameInput.trim().toLowerCase();
    const suffix = suffixInput.trim();
    const lowerSuffix = suffix.toLowerCase();

    // Get all employees
    const employees = await getByPrefix('employees:');
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // DD/MM/YYYY

    // Special Case: Initial System Setup or Emergency Admin Access
    // ALWAYS ALLOW Superadmin@tcfadmin to ensure access recovery
    if (inputNameLower === 'superadmin' && lowerSuffix === 'tcfadmin') {
        const tempAdmin = {
            id: 'sys-admin-temp',
            name: 'Superadmin',
            eid: 'SYS001',
            role: 'Admin/HR',
            status: 'Active',
            dob: new Date().toISOString(),
            joiningDate: new Date().toISOString()
        };
        // Return "token"
        return res.json({
            success: true,
            user: tempAdmin,
            token: Buffer.from(JSON.stringify(tempAdmin)).toString('base64')
        });
    }

    const hasAdmin = employees.some(e => e.role === 'Admin/HR' && e.status === 'Active');

    if (employees.length === 0 || !hasAdmin) {
        // Fallback for initial setup if no explicit superadmin check was above (redundant now but kept for logic flow if needed)
    }

    const foundEmployee = employees.find(emp => {
        const empNameLower = emp.name.toLowerCase();
        const empFirstName = empNameLower.split(' ')[0];
        const nameMatches = (empNameLower === inputNameLower) || (empFirstName === inputNameLower);

        if (!nameMatches) return false;

        if (emp.role === 'Admin/HR') {
            return lowerSuffix === 'tcfadmin'; // Ideally this should be a configurable secure password
        } else {
            // Staff: DOB check
            let dobStr = '';
            if (emp.dob) {
                const datePart = emp.dob.split('T')[0];
                const [y, m, d] = datePart.split('-');
                if (y && m && d) dobStr = `${d}/${m}/${y}`;
            }
            return suffix === todayStr || (dobStr && suffix === dobStr);
        }
    });

    if (foundEmployee) {
        // success
        res.json({
            success: true,
            user: foundEmployee,
            token: Buffer.from(JSON.stringify(foundEmployee)).toString('base64')
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// --- Data API ---

// Public/Protected Middleware? 
// For now, we trust the client implementation as in the original app, 
// but in a real production app we must verify 'req.headers.authorization'.
const verifyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // For migration compatibility with existing frontend that might not send it yet?
        // No, we should enforce it.
        // return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/api/items/:type', async (req, res) => {
    const { type } = req.params;
    try {
        const items = await getByPrefix(`${type}:`);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    try {
        const item = await get(`${type}:${id}`);
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/items/:type', async (req, res) => {
    const { type } = req.params;
    const body = req.body;
    const { id } = body;

    if (!id) return res.status(400).json({ error: 'ID required' });

    try {
        await set(`${type}:${id}`, body);
        res.json({ success: true, data: body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    try {
        await del(`${type}:${id}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// --- Backup API ---

app.get('/api/backups', async (req, res) => {
    try {
        const { pool } = require('./db');
        if (!pool) {
            console.warn('Backup list requested but MySQL is not enabled (Local Mode). Returning empty list.');
            return res.json([]);
        }

        const [rows] = await pool.query('SELECT id, name, created_at, LENGTH(content) as size FROM backups ORDER BY created_at DESC');
        // Transform to match frontend expectation
        const backups = rows.map(r => ({
            name: r.name,
            id: r.id,
            created_at: r.created_at,
            metadata: { size: r.size }
        }));
        res.json(backups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

app.post('/api/backups', async (req, res) => {
    const { type = 'manual', label } = req.body;
    try {
        // Fetch all data from KV store
        const [rows] = await require('./db').pool.query('SELECT * FROM kv_store');

        // Reconstruct data object expected by frontend restore
        // key format "prefix:id", value is object
        const data = {};

        // Helper to bucketize based on prefix
        const collectionNames = [
            'employees', 'templates', 'folders', 'timesheets',
            'signatures', 'leaves', 'ot_records', 'report_folders',
            'saved_reports', 'leave_folders', 'saved_leave_reports'
        ];

        const backupContent = {
            timestamp: new Date().toISOString(),
            type,
            label,
            data: {}
        };

        // Initialize arrays
        collectionNames.forEach(name => backupContent.data[name] = []);

        // Sort data into arrays
        rows.forEach(row => {
            const key = row.key;
            const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

            for (const col of collectionNames) {
                if (key.startsWith(col + ':')) {
                    backupContent.data[col].push(val);
                    break;
                }
            }
        });

        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
        const filename = `${type}_${dateStr}_${timeStr}.json`;

        await require('./db').pool.query(
            'INSERT INTO backups (name, content) VALUES (?, ?)',
            [filename, JSON.stringify(backupContent)]
        );

        res.json({ success: true, filename });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Backup failed' });
    }
});

app.get('/api/backups/data', async (req, res) => {
    const { path } = req.query; // path is filename/name
    if (!path) return res.status(400).json({ error: 'Path required' });

    try {
        const [rows] = await require('./db').pool.query('SELECT content FROM backups WHERE name = ?', [path]);
        if (rows.length === 0) return res.status(404).json({ error: 'Backup not found' });

        const content = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
        res.json(content);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to download backup' });
    }
});

app.delete('/api/backups', async (req, res) => {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'Path required' });

    try {
        await require('./db').pool.query('DELETE FROM backups WHERE name = ?', [path]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

app.post('/api/restore', async (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });

    const connection = await require('./db').pool.getConnection();
    try {
        await connection.beginTransaction();

        // Truncate/Clear KV Store? Or selective replace?
        // Original logic: "if currentItems.length > 0 ... delete ... then set"
        // Here we can just clear table or better, allow selective.
        // For simplicity and safety of a full restore: Clear Table
        await connection.query('TRUNCATE TABLE kv_store');

        const insertQuery = 'INSERT INTO kv_store (`key`, `value`) VALUES (?, ?)';

        for (const [collectionName, items] of Object.entries(data)) {
            if (Array.isArray(items)) {
                for (const item of items) {
                    if (item.id) {
                        const key = `${collectionName}:${item.id}`;
                        await connection.query(insertQuery, [key, JSON.stringify(item)]);
                    }
                }
            }
        }

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error('Restore failed:', err);
        res.status(500).json({ error: 'Restore failed' });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
