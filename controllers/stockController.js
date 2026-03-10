const db = require('../config/db');

exports.showStock = (req, res) => {
    db.all(`
        SELECT v.id AS variant_id, v.sku, v.size, v.color, v.stock, v.image AS variant_image,
            p.id AS product_id, p.name AS product_name,
            c.name AS category_name
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1
        ORDER BY p.name, v.color, v.size
    `, (err, variants) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        db.all(`
            SELECT sm.id, sm.type, sm.sku, sm.qty_change, sm.note, sm.created_at,
                u.username  AS actor_name,
                p.name      AS product_name,
                v.color, v.size, v.stock AS current_stock
            FROM stock_movements sm
            LEFT JOIN users u ON u.id = sm.actor_id
            LEFT JOIN product_variants v ON v.sku = sm.sku
            LEFT JOIN products p ON p.id = v.product_id
            ORDER BY sm.created_at DESC
            LIMIT 100
        `, [], (mvErr, movements) => {
            if (mvErr) {
                console.error(mvErr);
                movements = [];
            }

            // เตือนสต็อกใกล้หมด (stock <= 10)
            const lowStockItems = variants.filter(v => v.stock <= 10 && v.stock > 0);
            const outOfStockItems = variants.filter(v => v.stock === 0);

            // ดึง categories สำหรับ dropdown filter
            db.all(`SELECT * FROM categories ORDER BY name`, [], (catErr, categories) => {
                if (catErr) categories = [];

                res.render('stock/list', {
                    user: req.session.user,
                    currentPage: 'stock',
                    variants,
                    movements,
                    categories,
                    lowStockItems,
                    outOfStockItems,
                });
            });
        });
    });
};