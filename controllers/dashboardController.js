const db = require('../config/db');

exports.showDashboard = (req, res) => {
    const queries = {};

    // รายได้ทั้งหมด
    const q1 = new Promise((resolve) => {
        db.get(`SELECT COALESCE(SUM(total_amount),0) AS val
            FROM orders
            WHERE status != 'cancelled'
        `, [], (err, r) => {
            queries.totalRevenue = r?.val || 0;
            resolve();
        });
    });

    // ออเดอร์วันนี้
    const q2 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val
            FROM orders
            WHERE date(created_at) = date('now','localtime')
        `, [], (err, r) => {
            queries.todayOrders = r?.val || 0;
            resolve();
        });
    });

    // รายได้เดือนนี้
    const q3 = new Promise((resolve) => {
        db.get(`SELECT COALESCE(SUM(total_amount),0) AS val
            FROM orders
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')
            AND status != 'cancelled'
        `, [], (err, r) => {
            queries.monthRevenue = r?.val || 0;
            resolve();
        });
    });

    // ออเดอร์รอดำเนินการ
    const q4 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val
            FROM orders
            WHERE status = 'pending'
        `, [], (err, r) => {
            queries.pendingOrders = r?.val || 0;
            resolve();
        });
    });

    // จำนวนหมวดหมู่
    const q5 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val FROM categories
        `, [], (err, r) => {
            queries.totalCategories = r?.val || 0;
            resolve();
        });
    });

    // จำนวนสินค้า
    const q6 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val
            FROM products
            WHERE is_active = 1
        `, [], (err, r) => {
            queries.totalProducts = r?.val || 0;
            resolve();
        });
    });

    // จำนวนลูกค้า
    const q7 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val
            FROM users
            WHERE role = 'customer'
        `, [], (err, r) => {
            queries.totalCustomers = r?.val || 0;
            resolve();
        });
    });

    // stock ต่ำ (≤5)
    const q8 = new Promise((resolve) => {
        db.get(`SELECT COUNT(*) AS val
            FROM product_variants
            WHERE stock <= 5 AND stock > 0
        `, [], (err, r) => {
            queries.lowStock = r?.val || 0;
            resolve();
        });
    });

    // สินค้าแต่ละหมวด
    const q9 = new Promise((resolve) => {
        db.all(`
            SELECT c.code, c.name, COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            GROUP BY c.id ORDER BY product_count DESC
        `, [], (err, rows) => {
            queries.productsByCategory = rows || [];
            resolve();
        });
    });

    // ยอดขาย 7 วัน
    const q10 = new Promise((resolve) => {
        db.all(`
            SELECT date(created_at) AS day, COALESCE(SUM(total_amount),0) AS total
            FROM orders
            WHERE status != 'cancelled'
            AND created_at >= date('now','-6 days','localtime')
            GROUP BY day ORDER BY day ASC
        `, [], (err, rows) => {
            // เติมวันที่ไม่มีออเดอร์ให้ครบ 7 วัน
            const result = [];
            const days = ['อา','จ','อ','พ','พฤ','ศ','ส'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                const found = (rows || []).find(r => r.day === key);
                result.push({
                    label: days[d.getDay()],
                    total: found ? found.total : 0
                });
            }
            queries.salesLast7Days = result;
            resolve();
        });
    });

    // สินค้าขายดี 30 วัน
    const q11 = new Promise((resolve) => {
        db.all(`
            SELECT
                p.name, pv.sku, pv.image,
                SUM(oi.qty) AS total_sold,
                SUM(oi.qty * oi.price) AS total_revenue
            FROM order_items oi
            JOIN product_variants pv ON pv.id = oi.variant_id
            JOIN products p ON p.id = pv.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
            AND o.created_at >= date('now','-30 days','localtime')
            GROUP BY pv.sku
            ORDER BY total_sold DESC
            LIMIT 5
        `, [], (err, rows) => {
            queries.topProducts = rows || [];
            resolve();
        });
    });

    // ออเดอร์ล่าสุด 8 รายการ
    const q12 = new Promise((resolve) => {
        db.all(`
            SELECT o.id, o.status, o.total_amount,
            u.username
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC LIMIT 8
        `, [], (err, rows) => {
            queries.recentOrders = rows || [];
            resolve();
        });
    });

    Promise.all([q1, q2, q3,q4, q5, q6, q7, q8, q9, q10, q11, q12]).then(() => {
        res.render('dashboard', {
            currentPage: 'dashboard',
            stats: {
                totalRevenue: queries.totalRevenue,
                todayOrders: queries.todayOrders,
                monthRevenue: queries.monthRevenue,
                pendingOrders: queries.pendingOrders,
                totalCategories: queries.totalCategories,
                totalProducts: queries.totalProducts,
                totalCustomers: queries.totalCustomers,
                lowStock: queries.lowStock,
            },
            productsByCategory: queries.productsByCategory,
            salesLast7Days: queries.salesLast7Days,
            topProducts: queries.topProducts,
            recentOrders:  queries.recentOrders,
        });
    }).catch(err => {
        console.error('[dashboard]', err);
        res.status(500).send('Database Error');
    });
};
