const db = require('../config/db');

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
const COLOR_PRIORITY = ['WT', 'BK', 'GR', 'RD', 'BL', 'BR', 'SK', 'YL', 'PK', 'GN', 'PP'];

exports.showShop = (req, res) => {
    const categoryCode = req.query.category || null;
    const searchQuery = req.query.q || '';

    let sql = `
        SELECT p.id, p.name, p.price,
            c.code AS category_code,
            c.name AS category_name,
            (
                SELECT v.image FROM product_variants v
                WHERE v.product_id = p.id AND v.image IS NOT NULL
                LIMIT 1
            ) AS image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
    `;
    const params = [];
    if (categoryCode) {
        sql += ' AND c.code = ?';
        params.push(categoryCode);
    }
    if (searchQuery) {
        sql += ' AND p.name LIKE ?';
        params.push(`%${searchQuery}%`);
    }
    sql += ' ORDER BY p.created_at DESC';

    db.all(sql, params, (err, products) => {
        if (err) return res.status(500).send('Database Error');
        res.render('customer/shop', { products, selectedCategory: categoryCode, searchQuery });
    });
};

exports.showDetail = (req, res) => {
    const productId = req.params.id;

    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).send('Database Error');
        if (!product) return res.status(404).send('ไม่พบสินค้า');

        db.all('SELECT * FROM product_variants WHERE product_id = ?', [productId], (err, variants) => {
            if (err) return res.status(500).send('Database Error');

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
                });

            const firstImage = variants.find(v => v.image)?.image || null;

            res.render('customer/detail', { product, variants, colors, firstImage });
        });
    });
};
