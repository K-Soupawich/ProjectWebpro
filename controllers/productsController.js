const db = require('../config/db');
const path = require('path');

exports.listProducts = (req, res) => {
    db.all("SELECT * FROM products ORDER BY created_at DESC", (err, products) => {
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

    let sql = `INSERT INTO products (name, description, price, category_id) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name, description, parseFloat(price), parseInt(category_id)],

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

            colorList.forEach(colorCode => {
                // รูปภาพผูกกับ color (1 รูป/สี)
                const fileField = req.files && req.files[`colorImage_${colorCode}`];
                const imageFilename = fileField[0].filename;
                const stock = 0;

                sizeList.forEach(size => {
                    // SKU format: SH001BKS
                    const sku = `${skuBase}${colorCode}${size}`;
                    stmt.run([productId, size, colorCode, stock, sku, imageFilename]);
                });
            });

            stmt.finalize(finalErr => {
                if (finalErr) {
                    console.error(finalErr);
                    return res.status(500).send(finalErr.message);
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