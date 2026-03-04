const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./wms.db');

// Users
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

// Products
// db.run(`
// CREATE TABLE IF NOT EXISTS products (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT NOT NULL,
//     category TEXT,
//     size TEXT,
//     color TEXT,
//     price REAL NOT NULL,
//     stock INTEGER DEFAULT 0,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
// )`);

// Stock Movements
// db.run(`
// CREATE TABLE IF NOT EXISTS stock_movements (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     product_id INTEGER,
//     type TEXT CHECK(type IN ('IN','OUT')),
//     quantity INTEGER,
//     created_by INTEGER,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY(product_id) REFERENCES products(id),
//     FOREIGN KEY(created_by) REFERENCES users(id)
// )`);

module.exports = db;