const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./wms.db');

db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT UNIQUE,
    role TEXT CHECK(role IN ('admin','staff','customer')) DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = db;