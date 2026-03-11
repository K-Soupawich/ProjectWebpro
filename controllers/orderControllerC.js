const db = require('../config/db');
const { getCartItems } = require('./cartController');

exports.showPayment = (req, res) => {
    getCartItems(req.session.user.id, (err, cart) => {
        if (err) return res.status(500).send('Database Error');
        if (cart.length === 0) return res.redirect('/customer/cart');
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        res.render('customer/payment', { cart, subtotal, shipping: 50, total: subtotal + 50 });
    });
};

exports.placeOrder = (req, res) => {
    const userId = req.session.user.id;
    const address = (req.body.address || '').trim();
    const note = (req.body.note || '').trim();

    if (!address) return res.redirect('/customer/payment?error=address');

    getCartItems(userId, (err, cart) => {
        if (err) return res.status(500).send('Database Error');
        if (cart.length === 0) return res.redirect('/customer/cart');

        const shipping = 50;
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const total_amount = subtotal + shipping;

        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return res.status(500).send('Transaction Error');

            db.run(`
                INSERT INTO orders (user_id, status, shipping_fee, total_amount, address, note)
                VALUES (?, 'pending', ?, ?, ?, ?)
            `, [userId, shipping, total_amount, address, note || null], function(err) {
                if (err) return rollback(res, 'สร้างออเดอร์ไม่สำเร็จ');

                const orderId = this.lastID;
                let pending = cart.length * 3;
                let failed = false;

                function done(err) {
                    if (err) {
                        console.error('[placeOrder] done error:', err.message);
                        failed = true;
                    }
                    if (--pending > 0) return;
                    if (failed) return rollback(res, 'บันทึกรายการไม่สำเร็จ');

                    db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
                        if (err) return rollback(res, 'ล้างตะกร้าไม่สำเร็จ');
                        db.run('COMMIT');
                        res.redirect('/customer/cart');
                    });
                }

                cart.forEach(item => {
                    db.run(`
                        INSERT INTO order_items (order_id, variant_id, product_name, size, color, image, price, qty)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [orderId, item.variantId, item.name, item.size, item.color, item.image, item.price, item.qty], done);

                    db.run(`UPDATE product_variants SET stock = stock - ? WHERE id = ?`,
                        [item.qty, item.variantId], done);

                    db.run(`
                        INSERT INTO stock_movements (type, sku, qty_change, actor_id, ref_id, note)
                        SELECT 'sale', v.sku, ?, ?, ?, 'customer place order'
                        FROM product_variants v WHERE v.id = ?
                    `, [item.qty, userId, orderId, item.variantId], done);
                });
            });
        });
    });

    function rollback(res, msg) {
        db.run('ROLLBACK');
        res.status(500).send('เกิดข้อผิดพลาด: ' + msg);
    }
};
