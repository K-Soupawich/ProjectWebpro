const db = require('../config/db');

exports.showShop = (req, res) => {
    const categoryCode = req.query.category || null;

    let sql = `
        SELECT
            p.id,
            p.name,
            p.price,
            c.code  AS category_code,
            c.name  AS category_name,
            (
                SELECT pv.image
                FROM   product_variants pv
                WHERE  pv.product_id = p.id
                  AND  pv.image IS NOT NULL
                LIMIT  1
            ) AS image
        FROM  products  p
        JOIN  categories c ON p.category_id = c.id
        WHERE p.is_active = 1
    `;

    const params = [];

    if (categoryCode) {
        sql += ' AND c.code = ?';
        params.push(categoryCode);
    }

    sql += ' ORDER BY p.created_at DESC';

    db.all(sql, params, (err, products) => {
        if (err) {
            console.error('[showShop]', err);
            return res.status(500).send('Database Error');
        }
        res.render('customer/shop', {
            products,
            selectedCategory: categoryCode
        });
    });
};

const COLORS = [
    { code: 'BK', label: 'Black', hex: '#0e0e0e' },
    { code: 'WT', label: 'White', hex: '#eeeeee' },
    { code: 'PK', label: 'Pink', hex: '#FFCCF6' },
    { code: 'RD', label: 'Red', hex: '#e03030' },
    { code: 'BL', label: 'Blue', hex: '#2560e0' },
    { code: 'SK', label: 'Sky', hex: '#7ec8e3' },
    { code: 'YL', label: 'Yellow', hex: '#f5d800' },
    { code: 'BR', label: 'Brown', hex: '#573529' },
    { code: 'GN', label: 'Green', hex: '#22c55e' },
    { code: 'PP', label: 'Purple', hex: '#973aee' },
    { code: 'GR', label: 'Gray', hex: '#9299a5' },
];

COLOR_PRIORITY = ['WT', 'BK', 'GR', 'RD', 'BL', 'BR', 'SK', 'YL', 'PK', 'GN', 'PP'];

exports.showDetail = (req, res) => {
    const productId = req.params.id;

    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            console.error('[showDetail product]', err);
            return res.status(500).send('Database Error');
        }
        if (!product) return res.status(404).send('ไม่พบสินค้า');

        db.all(
            'SELECT * FROM product_variants WHERE product_id = ?',
            [productId],
            (err, variants) => {
                if (err) {
                    console.error('[showDetail variants]', err);
                    return res.status(500).send('Database Error');
                }

                // สีไม่ซ้ำ พร้อม hex
                const colorCodes = [...new Set(variants.map(v => v.color))];
                const colors = colorCodes
                    .map(code => {
                        const found = COLORS.find(c => c.code === code);
                        return { code, hex: found ? found.hex : '#cccccc' };
                    })
                    .sort((a, b) => {
                        const ai = COLOR_PRIORITY.indexOf(a.code);
                        const bi = COLOR_PRIORITY.indexOf(b.code);
                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                    });;

                // รูปภาพแรกที่มี
                const firstImage =
                    variants.find(v => v.image)?.image || null;

                res.render('customer/detail', {
                    product,
                    variants,
                    colors,
                    firstImage,
                });
            }
        );
    });
};

function getCartItems(userId, callback) {
    db.all(`
        SELECT
            c.id         AS cartId,
            c.variant_id AS variantId,
            c.qty,
            pv.size,
            pv.color,
            pv.image,
            pv.stock,
            p.id         AS productId,
            p.name,
            p.price
        FROM cart c
        JOIN product_variants pv ON pv.id = c.variant_id
        JOIN products         p  ON p.id  = pv.product_id
        WHERE c.user_id = ?
        ORDER BY c.created_at ASC
    `, [userId], callback);
}

// ============================================================
// CART routes
// ============================================================

// GET /customer/cart
exports.showCart = (req, res) => {
    const userId = req.session.user.id;

    getCartItems(userId, (err, cart) => {
        if (err) return res.status(500).send('Database Error');

        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const shipping = cart.length > 0 ? 50 : 0;
        const total    = subtotal + shipping;

        res.render('customer/cart', { cart, subtotal, shipping, total });
    });
};

// POST /customer/cart/add
exports.addToCart = (req, res) => {
    const userId    = req.session.user.id;
    const variantId = parseInt(req.body.variantId);
    const qty       = Math.max(1, parseInt(req.body.qty) || 1);

    db.get('SELECT stock FROM product_variants WHERE id = ?', [variantId], (err, variant) => {
        if (err || !variant) return res.status(404).send('ไม่พบสินค้า');
        if (variant.stock < 1) return res.status(400).send('สินค้าหมด');

        db.run(`
            INSERT INTO cart (user_id, variant_id, qty)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, variant_id)
            DO UPDATE SET qty = MIN(cart.qty + excluded.qty, ?)
        `, [userId, variantId, qty, variant.stock], function(err) {
            if (err) return res.status(500).send('Database Error');
            res.redirect('/customer/cart');
        });
    });
};

// POST /customer/cart/update  (qty <= 0 = ลบ)
exports.updateCart = (req, res) => {
    const userId    = req.session.user.id;
    const variantId = parseInt(req.body.variantId);
    const qty       = parseInt(req.body.qty);

    if (qty <= 0) {
        db.run('DELETE FROM cart WHERE user_id = ? AND variant_id = ?',
            [userId, variantId],
            () => res.redirect('/customer/cart'));
    } else {
        db.get('SELECT stock FROM product_variants WHERE id = ?', [variantId], (err, v) => {
            const safeQty = v ? Math.min(qty, v.stock) : qty;
            db.run('UPDATE cart SET qty = ? WHERE user_id = ? AND variant_id = ?',
                [safeQty, userId, variantId],
                () => res.redirect('/customer/cart'));
        });
    }
};

// POST /customer/cart/remove
exports.removeFromCart = (req, res) => {
    const userId    = req.session.user.id;
    const variantId = parseInt(req.body.variantId);

    db.run('DELETE FROM cart WHERE user_id = ? AND variant_id = ?',
        [userId, variantId],
        () => res.redirect('/customer/cart'));
};

// ============================================================
// ORDER — แปลง cart → order (transaction)
// ============================================================

// POST /customer/order/place
exports.placeOrder = (req, res) => {
    const userId  = req.session.user.id;
    const address = (req.body.address || '').trim();
    const note    = (req.body.note    || '').trim();

    if (!address) return res.redirect('/customer/cart?error=address');

    getCartItems(userId, (err, cart) => {
        if (err) return res.status(500).send('Database Error');
        if (cart.length === 0) return res.redirect('/customer/cart');

        // เช็ค stock ทุกรายการก่อน
        const outOfStock = cart.filter(i => i.qty > i.stock);
        if (outOfStock.length > 0) {
            const names = outOfStock.map(i => `${i.name} (${i.size}/${i.color})`).join(', ');
            return res.redirect('/customer/cart?error=stock&items=' + encodeURIComponent(names));
        }

        const shipping     = 50;
        const subtotal     = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const total_amount = subtotal + shipping;

        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return res.status(500).send('Transaction Error');

            // 1. สร้าง order
            db.run(`
                INSERT INTO orders (user_id, status, shipping_fee, total_amount, address, note)
                VALUES (?, 'pending', ?, ?, ?, ?)
            `, [userId, shipping, total_amount, address || null, note || null],
            function(err) {
                if (err) return rollback(res, 'สร้างออเดอร์ไม่สำเร็จ');

                const orderId = this.lastID;
                let pending   = cart.length * 3; // 3 queries ต่อ 1 item
                let failed    = false;

                function done(err) {
                    if (err) failed = true;
                    pending--;
                    if (pending > 0) return;
                    if (failed) return rollback(res, 'บันทึกรายการไม่สำเร็จ');

                    // ล้าง cart
                    db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
                        if (err) return rollback(res, 'ล้างตะกร้าไม่สำเร็จ');
                        db.run('COMMIT');
                        res.redirect('/customer/order/' + orderId);
                    });
                }

                cart.forEach(item => {
                    // 2. snapshot รายการ
                    db.run(`
                        INSERT INTO order_items
                            (order_id, variant_id, product_name, size, color, image, price, qty)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [orderId, item.variantId, item.name,
                        item.size, item.color, item.image,
                        item.price, item.qty], done);

                    // 3. ลด stock
                    db.run(`
                        UPDATE product_variants SET stock = stock - ? WHERE id = ?
                    `, [item.qty, item.variantId], done);

                    // 4. บันทึก stock movement
                    db.run(`
                        INSERT INTO stock_movements (variant_id, type, qty, ref_id, ref_type, note)
                        VALUES (?, 'out', ?, ?, 'order', 'customer place order')
                    `, [item.variantId, item.qty, orderId], done);
                });
            });
        });
    });

    function rollback(res, msg) {
        db.run('ROLLBACK');
        res.status(500).send('เกิดข้อผิดพลาด: ' + msg);
    }
};

// GET /customer/order/:id
exports.showOrder = (req, res) => {
    const orderId = req.params.id;
    const userId  = req.session.user.id;

    db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, order) => {
        if (err) return res.status(500).send('Database Error');
        if (!order) return res.status(404).send('ไม่พบออเดอร์');

        db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
            if (err) return res.status(500).send('Database Error');
            res.render('customer/order_confirm', { order, items });
        });
    });
};

// GET /customer/orders
exports.showOrders = (req, res) => {
    const userId = req.session.user.id;

    db.all(`
        SELECT
            o.*,
            COUNT(oi.id) AS item_count
        FROM  orders      o
        JOIN  order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `, [userId], (err, orders) => {
        if (err) return res.status(500).send('Database Error');
        res.render('customer/orders', { orders });
    });
};

exports.showProfile = (req, res) => {
    const userId = req.session.user?.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, userData) => {
        if (err) {
            console.error('[showProfile]', err);
            return res.status(500).send('Database Error');
        }

        res.render('customer/profile', {
            user: req.session.user,
            userData
        });
    });
};

exports.updateProfile = (req, res) => {
    const { email, phone, address } = req.body;
    const userId = req.session.user?.id;

    if (!userId) return res.redirect('/login');

    db.run(
        'UPDATE users SET email = ?, phone = ?, address = ? WHERE id = ?',
        [email, phone, address, userId],
        (err) => {
            if (err) {
                console.error('[updateProfile]', err);
                return res.status(500).send('Database Error');
            }
            // อัปเดต session ด้วยถ้ามีฟิลด์ที่ใช้แสดงผล
            res.redirect('/customer/profile');
        }
    );
};