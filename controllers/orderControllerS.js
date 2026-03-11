const db = require('../config/db');

const VALID_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

exports.showOrders = (req, res) => {
    const selectedStatus = req.query.status || '';

    db.all(`SELECT status, COUNT(*) as cnt FROM orders GROUP BY status`, [], (err, rows) => {
        const counts = { total: 0 };
        (rows || []).forEach(r => {
            counts[r.status] = r.cnt;
            counts.total += r.cnt;
        });

        let sql = `
            SELECT o.*,
                u.username, u.avatar,
                COUNT(oi.id) AS item_count
            FROM orders o
            JOIN users u ON u.id = o.user_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
        `;
        const params = [];
        if (selectedStatus) {
            sql += ' WHERE o.status = ?';
            params.push(selectedStatus);
        }
        sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

        db.all(sql, params, (err, orders) => {
            if (err) {
                console.error('[showOrders]', err);
                return res.status(500).send('Database Error');
            }
            res.render('orders/list', {
                orders,
                counts,
                selectedStatus,
                currentPage: 'orders'
            });
        });
    });
};

exports.getOrderItems = (req, res) => {
    const orderId = req.params.id;

    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [orderId], (err, items) => {
        if (err) return res.status(500).json({ message: 'Database Error' });
        res.json({ items });
    });
};

exports.updateStatus = (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }

    db.run(
        `UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
        [status, orderId],
        function(err) {
            if (err) {
                console.error('[updateStatus]', err);
                return res.status(500).json({ message: 'Database Error' });
            }
            if (this.changes === 0) return res.status(404).json({ message: 'ไม่พบออเดอร์' });
            res.json({ success: true });
        }
    );
};
