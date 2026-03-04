const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./wms.db');
db.serialize(() => {

    db.run(`PRAGMA foreign_keys = ON`);

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

// Categories
    db.run(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

// Products
    db.run(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        category_id INTEGER,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);

// ========ใส่ข้อมูล=========
    db.run(`
    INSERT OR IGNORE INTO categories (id, name)
    VALUES (1, 'เสื้อยืด')
    `);

// format (name ,description, price, stock, category_id , image,)
    db.run(`
    INSERT OR IGNORE INTO products 
    (name, description, price, stock, category_id, image)
    VALUES
    ('เสื้อยืด Space of Loves', 'เสื้อผ้าคุณภาพดี ใส่สบาย', 250, 15, 1, 'spaceofloves.png'),
    ('เสื้อยืด Heart Mind', 'ดีไซน์เรียบหรู ใส่ได้ทุกวัน', 270, 10, 1, 'heartmind.png'),
    ('เสื้อยืด ปลาแดกราเมน', 'ลายสุดฮิต ขายดี', 550, 5, 1, 'fishramen.png'),
    ('เสื้อยืด ปลาแดกราเมน', 'ลายสุดฮิต ขายดี', 550, 5, 1, 'fishramen.png'),
    ('เสื้อยืด ปลาแดกราเมน', 'ลายสุดฮิต ขายดี', 550, 5, 1, 'fishramen.png'),
    ('เสื้อยืด Heart Mind', 'ดีไซน์เรียบหรู ใส่ได้ทุกวัน', 270, 10, 1, 'heartmind.png'),
    ('เสื้อยืด Space of Loves', 'เสื้อผ้าคุณภาพดี ใส่สบาย', 250, 15, 1, 'spaceofloves.png'),
    ('เสื้อยืด Space of Loves', 'เสื้อผ้าคุณภาพดี ใส่สบาย', 250, 15, 1, 'spaceofloves.png')
    `);

});

module.exports = db;