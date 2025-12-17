const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'local_data.json');

// Initialize
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function get(key) {
    const data = loadData();
    return data[key] || null;
}

async function set(key, value) {
    const data = loadData();
    data[key] = value;
    saveData(data);
}

async function del(key) {
    const data = loadData();
    delete data[key];
    saveData(data);
}

async function getByPrefix(prefix) {
    const data = loadData();
    return Object.keys(data)
        .filter(k => k.startsWith(prefix))
        .map(k => data[k]);
}

module.exports = { get, set, del, getByPrefix };
