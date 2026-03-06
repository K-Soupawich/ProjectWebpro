const express = require("express");
const multer = require("multer")
const router = express.Router();
const db = require('../config/db');
const path = require("path")
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

router.get("/", isLoggedIn, authorize(['admin', 'staff']), (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        res.render("products/list", {
            user: req.session.user,
            products: products
        });
    });
});

router.get("/add", isLoggedIn, authorize(['admin', 'staff']), (req, res) => {
    res.render("products/add", {
        user: req.session.user
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/");
    },

    filename: function (req, file, cb) {
        const sku = req.body.sku;

        const ext = path.extname(file.originalname);

        cb(null, sku + ext);
    }
});

const upload = multer({ storage: storage });

router.post("/add", upload.single("image"), (req, res) => {
    const { name, price, category, sku, description } = req.body;

    const image = req.file.filename;

    db.run(`
        INSERT INTO products (name, price, category, sku, description, image)
        VALUES (?,?,?,?,?,?)
    `, [name, price, category, sku, description, image]);

    res.redirect("/products");
});

module.exports = router;