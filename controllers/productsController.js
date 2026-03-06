const fs = require('fs');
const db = require('../config/db');
const path = require('path');

exports.listProducts = (req, res) => {
    db.all(`
        SELECT p.*, 
            c.name AS category_name,
            GROUP_CONCAT(v.color || ':' || COALESCE(v.image, ''), ',') AS variant_images
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_variants v ON p.id = v.product_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `, (err, products) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.render("products/list", {
            user: req.session.user,
            products,
            currentPage: 'products'
        });
    });
};

exports.showAdd = (req, res) => {
    db.all("SELECT * FROM categories ORDER BY name", (err, categories) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.render('products/add', {
            user: req.session.user,
            categories,
            currentPage: 'products'
        });
    });
};

exports.createProduct = (req, res) => {
    const { name, description, price, category_id, skuBase, sizes, colors } = req.body;

    if (!name || !price || !category_id || !skuBase) {
        return res.status(400).send("กรุณากรอกข้อมูลให้ครบ");
    }

    const colorList = colors ? colors.split(',').filter(Boolean) : [];
    const sizeList = sizes ? sizes.split(',').filter(Boolean) : [];

    db.run(
        `INSERT INTO products (name, description, price, category_id) VALUES (?, ?, ?, ?)`,
        [name, description, parseFloat(price), parseInt(category_id)],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send(err.message);
            }

            const productId = this.lastID;

            if (colorList.length === 0 || sizeList.length === 0) {
                return res.redirect('/products');
            }

            // สร้าง variants: 1 row ต่อ color×size
            const stmt = db.prepare(
                `INSERT INTO product_variants (product_id, size, color, stock, sku, image)
                 VALUES (?, ?, ?, ?, ?, ?)`
            );
            console.log('req.files:', req.files);
            console.log('colors:', colors);
            console.log('colorList:', colorList);
            colorList.forEach(colorCode => {
                // รูปภาพผูกกับ color (1 รูป/สี)
                const fileField = req.files && req.files[`colorImage_${colorCode}`];
                let imageFilename = null;

                console.log('skuBase:', skuBase);
                console.log('colorCode:', colorCode);
                console.log('fileField:', fileField ? fileField[0].filename : 'no file');

                console.log('กำลังหา:', `colorImage_${colorCode}`);
                console.log('keys ใน req.files:', Object.keys(req.files));
                console.log('ตรงกันมั้ย:', Object.keys(req.files).includes(`colorImage_${colorCode}`));

                if (fileField) {
                    const tmpName = fileField[0].filename; // tmp_BK_1234567890.jpg
                    const ext = path.extname(tmpName);
                    const newName = `${skuBase}${colorCode}${ext}` // SH001-BK.jpg
                    const oldPath = `public/uploads/${tmpName}`;
                    const newPath = `public/uploads/${newName}`;
                    fs.renameSync(oldPath, newPath);
                    imageFilename = newName;
                }

                const stock = parseInt(req.body[`stock_${colorCode}`] || 0);
                sizeList.forEach(size => {
                    // SKU format: SH001BKS
                    const sku = `${skuBase}${colorCode}${size}`;
                    stmt.run([productId, size, colorCode, stock, sku, imageFilename]);
                });
            });

            stmt.finalize(err2 => {
                if (err2) {
                    console.error(err2);
                    return res.status(500).send(err2.message);
                }

                res.redirect('/products');
            });
        }
    );
};

exports.showEdit = (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, product) => {
        if (err || !product) return res.status(404).send("ไม่พบสินค้า");
        res.render("products/edit", {
            user: req.session.user,
            product,
            currentPage: 'products'
        });
    });
};

exports.updateProduct = (req, res) => {
    const { name, price, category, description, sizes } = req.body;
    const id = req.params.id;

    if (req.file) {
        db.run(
            `UPDATE products SET name=?, price=?, category=?, description=?, sizes=?, image=? WHERE id=?`,
            [name, price, category, description, sizes || null, req.file.filename, id],
            err => {
                if (err) return res.status(500).send(err.message);
                res.redirect("/products");
            }
        );
    } else {
        db.run(
            `UPDATE products SET name=?, price=?, category=?, description=?, sizes=? WHERE id=?`,
            [name, price, category, description, sizes || null, id],
            err => {
                if (err) return res.status(500).send(err.message);
                res.redirect("/products");
            }
        );
    }
};

exports.deleteProduct = (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", [req.params.id], err => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/products");
    });
};

exports.getNextSKU = (req, res) => {
    const code = req.query.code;  // 'SH', 'PN', ...
    if (!code) return res.json({ sku: '' });

    // นับจำนวน products ที่อยู่ใน category นี้ แล้ว +1
    let sql = `
        SELECT COUNT(*) AS total
        FROM products
        WHERE category_id = (SELECT id FROM categories WHERE code = ?)
    `;

    db.get(sql, [code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const num = String(row.total + 1).padStart(3, '0');
        res.json({ sku: code + num });  // { sku: 'SH003' }
    });
};