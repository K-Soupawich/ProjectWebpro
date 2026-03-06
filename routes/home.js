const express = require('express');
const router = express.Router();
const db = require('../config/db');

// สร้าง route รับค่า category
router.get("/products", (req, res) => {

    const categoryCode = req.query.category;

    let sql = `
        SELECT products.*
        FROM products
        JOIN categories
        ON products.category_id = categories.id
    `;

    let params = [];

    if (categoryCode) {
        sql += " WHERE categories.code = ?";
        params.push(categoryCode);
    }

    db.all(sql, params, (err, rows) => {

        res.render("customer", {
            products: rows
        });

    });

});

module.exports = router;