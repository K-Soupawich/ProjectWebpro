const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
    db.all(`
        SELECT p.id, p.name, p.price,
            (
                SELECT pv.image
                FROM product_variants pv
                WHERE pv.product_id = p.id
                AND pv.image IS NOT NULL
                LIMIT 1
            ) AS image
        FROM products p
        WHERE p.is_active = 1
        ORDER BY RANDOM()
        LIMIT 8
    `, [], (err, products) => {
        if (err) {
            console.error('[homeRoute]', err);
            return res.status(500).send('Database error');
        }
        res.render('home', { products });
    });
});

module.exports = router;