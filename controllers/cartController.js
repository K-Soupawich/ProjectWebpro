const db = require('../config/db');

function getCartItems(userId, callback) {
    db.all(`
        SELECT
            c.id AS cartId, c.variant_id AS variantId, c.qty,
            v.size, v.color, v.image, v.stock,
            p.id AS productId, p.name, p.price
        FROM cart c
        JOIN product_variants v ON v.id = c.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE c.user_id = ?
        ORDER BY c.created_at ASC
    `, [userId], callback);
}

exports.getCartItems = getCartItems;

exports.showCart = (req, res) => {
    const userId = req.session.user.id;

    getCartItems(userId, (err, cart) => {
        if (err) return res.status(500).send('Database Error');
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const shipping = cart.length > 0 ? 50 : 0;
        res.render('customer/cart', { cart, subtotal, shipping, total: subtotal + shipping });
    });
};

exports.addToCart = (req, res) => {
    const userId = req.session.user.id;
    const variantId = parseInt(req.body.variantId);
    const qty = Math.max(1, parseInt(req.body.qty) || 1);

    db.get('SELECT stock FROM product_variants WHERE id = ?', [variantId], (err, variant) => {
        if (err || !variant) return res.status(404).send('ไม่พบสินค้า');
        if (variant.stock < 1) return res.status(400).send('สินค้าหมด');

        db.run(`
            INSERT INTO cart (user_id, variant_id, qty) VALUES (?, ?, ?)
            ON CONFLICT(user_id, variant_id)
            DO UPDATE SET qty = MIN(cart.qty + excluded.qty, ?)
        `, [userId, variantId, qty, variant.stock], (err) => {
            if (err) return res.status(500).send('Database Error');

            if (req.body.redirect === 'payment') {
                return res.redirect('/customer/payment');
            }
            
            res.redirect('/customer/cart');
        });
    });
};

exports.updateCart = (req, res) => {
    const userId = req.session.user.id;
    const variantId = parseInt(req.body.variantId);
    const qty = parseInt(req.body.qty);

    if (qty <= 0) {
        db.run('DELETE FROM cart WHERE user_id = ? AND variant_id = ?',
            [userId, variantId], () => res.redirect('/customer/cart'));
    } else {
        db.get('SELECT stock FROM product_variants WHERE id = ?', [variantId], (err, v) => {
            const safeQty = v ? Math.min(qty, v.stock) : qty;
            db.run('UPDATE cart SET qty = ? WHERE user_id = ? AND variant_id = ?',
                [safeQty, userId, variantId], () => res.redirect('/customer/cart'));
        });
    }
};

exports.removeFromCart = (req, res) => {
    const userId = req.session.user.id;
    const variantId = parseInt(req.body.variantId);

    db.run('DELETE FROM cart WHERE user_id = ? AND variant_id = ?',
        [userId, variantId], () => res.redirect('/customer/cart'));
};
