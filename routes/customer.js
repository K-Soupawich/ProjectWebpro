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

const COLORS = [
  { code: 'BK', hex: '#3d2b1f' },
  { code: 'WT', hex: '#f0f0f0' },
  { code: 'PK', hex: '#e8c9b8' },
  { code: 'RD', hex: '#e03030' },
  { code: 'BL', hex: '#2560e0' },
  { code: 'SK', hex: '#8B7355' },
  { code: 'YL', hex: '#f5d800' },
  { code: 'BR', hex: '#8B6340' },
  { code: 'GN', hex: '#22c55e' },
  { code: 'PP', hex: '#a855f7' },
  { code: 'GR', hex: '#d1cfc9' }
];

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

            // ดึงสีที่ไม่ซ้ำจาก variants
            const colorCodes = [...new Set(details.map(v => v.color))];

            // map code → hex เฉพาะสีที่มีใน DB
            const colors = colorCodes.map(code => {
                const found = COLORS.find(c => c.code === code);
                console.log(code, '->', found);
                return { code, hex: found ? found.hex : '#cccccc' };
            });

            res.render('detail', { product, variants: details, colors });
        });

    });
  
});

module.exports = router;