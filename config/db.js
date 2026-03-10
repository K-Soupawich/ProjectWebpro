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
        role TEXT CHECK(role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
        created_at DEFAULT (datetime('now', 'localtime'))
    )`);

    // Categories
    db.run(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        created_at DEFAULT (datetime('now', 'localtime'))
    )`);

    // Products
    db.run(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category_id INTEGER,
        created_at DEFAULT (datetime('now', 'localtime')),
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);

    // Products Variant
    db.run(`
    CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        size TEXT,
        color TEXT,
        stock INTEGER DEFAULT 0,
        sku TEXT,
        image TEXT,
        created_at DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );`)

    // Cart
    db.run(`
    CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        variant_id INTEGER NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1 CHECK(qty > 0),
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)            ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
        UNIQUE (user_id, variant_id)
    )`);

    // Orders
    db.run(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','shipped','delivered','cancelled')),
        shipping_fee REAL NOT NULL DEFAULT 50,
        total_amount REAL NOT NULL,
        address TEXT,
        note TEXT,
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Order Items
    db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        variant_id INTEGER,
        product_name TEXT NOT NULL,
        size TEXT,
        color TEXT,
        image TEXT,
        price REAL NOT NULL,
        qty INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    )`);

    // Stock Receipt
    db.run(`
    CREATE TABLE IF NOT EXISTS stock_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grn_ref TEXT,
        sku TEXT NOT NULL,
        qty_received INTEGER NOT NULL,
        received_by INTEGER,
        received_at DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (received_by) REFERENCES users(id)
    );`)

    // Stock Movement
    db.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('receive', 'sale', 'adjust', 'remove')),
        sku TEXT NOT NULL,
        qty_change INTEGER NOT NULL,
        actor_id INTEGER,
        ref_id INTEGER,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_id) REFERENCES users(id)
    )`);

    // ========ใส่ข้อมูล=========

    // format (username, email, password, phone, role)
    const bcrypt = require("bcrypt");

    (async () => {
        const hashedPassword = await bcrypt.hash("1234", 10);

        db.run(`
            INSERT OR IGNORE INTO users (username, email, password, phone, role)
            VALUES (?, ?, ?, ?, ?)
        `, ["staff1", "staff1@gmail.com", hashedPassword, "0812345678", "staff"]);
    })();

    db.run(`
        INSERT OR IGNORE INTO categories (code, name) VALUES
        ('UW', 'ชุดชั้นใน'),
        ('SH', 'เสื้อ'),
        ('SK', 'กระโปรง'),
        ('PN', 'กางเกง'),
        ('DR', 'เดรส'),
        ('CT', 'เสื้อแขนยาว')
    `);
});

module.exports = db;