const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get("/shop", (req, res) => {

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

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.render("customer", {
            products: rows
        });

    });

});

router.get('/detail/:id', (req, res) => {
    // ดึงข้อมูลสินค้าด้วย req.params.id
    const productId = req.params.id;

    //ดึงข้อมูลตารางสินค้า
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        //ดึงข้อมูลจากตาราง product_variants
        db.all("SELECT * FROM product_variants WHERE product_id = ?", [productId], (err, details) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }
            console.log(details)
            res.render('detail', { product, variants: details });
        });

    });
  
});

module.exports = router;