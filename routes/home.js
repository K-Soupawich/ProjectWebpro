const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
    db.all(`
        SELECT * FROM products 
        WHERE stock > 1
        ORDER BY RANDOM()
        LIMIT 7
    `, [], (err, products) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }
        res.render('home', { products });
    });
});

module.exports = router;