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
        WHERE p.is_active = 1
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
            
            colorList.forEach(colorCode => {
                // รูปภาพผูกกับ color (1 รูป/สี)
                const fileField = req.files && req.files[`colorImage_${colorCode}`];
                let imageFilename = null;

                if (fileField) {
                    const tmpName = fileField[0].filename; // tmp_BK_1234567890.jpg
                    const ext = path.extname(tmpName);
                    const newName = `${skuBase}${colorCode}${ext}` // SH001BK.jpg
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
    const id = req.params.id;
    console.log('id:', id);  

    db.all(`
        SELECT
            p.id, p.name, p.description, p.price, p.category_id,
            v.id AS variant_id, v.size, v.color, v.stock, v.sku, v.image AS variant_image
        FROM products p
        LEFT JOIN product_variants v ON v.product_id = p.id
        WHERE p.id = ?
        AND p.is_active = 1
    `, [id], (err, rows) => {
        if (err || !rows.length) {
            console.log('err:', err);
            console.log('rows:', rows);
            return res.status(404).send("ไม่พบสินค้า");
        }

        const product = {
            id: rows[0].id,
            name: rows[0].name,
            description: rows[0].description,
            price: rows[0].price,
            category_id: rows[0].category_id
        };

        const variants = rows.reduce((acc, r) => {
            if (r.variant_id) acc.push({
                id: r.variant_id,
                color: r.color,
                size: r.size,
                sku: r.sku,
                image: r.variant_image
            });
            return acc;
        }, []);

        const skuBase = variants[0]?.sku?.slice(0, 5) || '';

        const existingSizes = [];
        for (const v of variants) {
            if (v.size && !existingSizes.includes(v.size)) {
                existingSizes.push(v.size);
            }
        }

        db.all("SELECT * FROM categories ORDER BY name", (err2, categories) => {
            if (err2) return res.status(500).send(err2.message);

            res.render("products/edit", {
                user: req.session.user,
                product, categories, variants, skuBase, existingSizes,
                currentPage: 'products'
            });
        });
    });
};

exports.updateProduct = (req, res) => {
    const { name, price, category_id, description, skuBase, sizes, colors } = req.body;
    const id = req.params.id;

    if (!name || !price || !category_id) {
        return res.status(400).send("กรุณากรอกข้อมูลให้ครบ");
    }

    const colorList = colors ? colors.split(',').filter(Boolean) : [];
    const sizeList = sizes ? sizes.split(',').filter(Boolean) : [];

    db.run(
        `UPDATE products SET name=?, price=?, category_id=?, description=? WHERE id=?`,
        [name, parseFloat(price), parseInt(category_id), description || null, id],
        function (err) {
            if (err) return res.status(500).send(err.message);

            if (colorList.length === 0 || sizeList.length === 0) {
                return res.redirect('/products');
            }

            db.run(`DELETE FROM product_variants WHERE product_id = ?`, [id], function (err2) {
                if (err2) return res.status(500).send(err2.message);

                const stmt = db.prepare(
                    `INSERT INTO product_variants (product_id, size, color, stock, sku, image) VALUES (?, ?, ?, ?, ?, ?)`
                );

                colorList.forEach(colorCode => {
                    let imageFilename = req.body[`existingImage_${colorCode}`] || null;

                    const fileField = req.files && req.files[`colorImage_${colorCode}`];
                    if (fileField) {
                        const tmpName = fileField[0].filename;
                        const ext = path.extname(tmpName);
                        const newName = `${skuBase}${colorCode}${ext}`;
                        fs.renameSync(`public/uploads/${tmpName}`, `public/uploads/${newName}`);
                        imageFilename = newName;
                    }

                    const stock = parseInt(req.body[`stock_${colorCode}`] || 0);
                    sizeList.forEach(size => {
                        const sku = `${skuBase}${colorCode}${size}`;
                        stmt.run([id, size, colorCode, stock, sku, imageFilename]);
                    });
                });

                stmt.finalize(err3 => {
                    if (err3) return res.status(500).send(err3.message);
                    res.redirect('/products');
                });
            });
        }
    );
};

exports.deleteProduct = (req, res) => {
    const id = req.params.id;

    db.all(`
        SELECT DISTINCT image
        FROM product_variants
        WHERE product_id = ?
        AND image IS NOT NULL
    `,
        [id],
        (err, rows) => {
            // debug log
            console.log('=== deleteProduct ===');
            console.log('product_id:', id);
            console.log('images to delete:', rows);

            if (err) return res.status(500).send(err.message);
            // ลบไฟล์รูปทั้งหมด
            rows.forEach(row => {
                const filePath = path.join(__dirname, '../public/uploads', row.image);
                fs.unlink(filePath, err => {
                    if (err) {
                        console.warn("ลบไฟล์ไม่ได้:", filePath, err.message)
                    } else {
                        console.log("ลบไฟล์สำเร็จ:", filePath);
                    }
                });
            });

            // Soft delete
            db.run("UPDATE products SET is_active = 0 WHERE id = ?", [id], err2 => {
                if (err2) return res.status(500).send(err2.message);
                res.redirect("/products");
            });
        }
    );
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