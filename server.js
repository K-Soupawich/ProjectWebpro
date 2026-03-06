const express = require('express');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoute');
const productsRoutes = require("./routes/productsRoute");
const { isLoggedIn, authorize } = require('./middleware/authMiddleware');
const customerRoute = require('./routes/customer');

const app = express();
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ===== Session Config =====
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 // 1 ชั่วโมง
    }
}));

// ===== ส่ง user ไปทุก view =====
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ===== Public Routes =====
app.use('/', authRoutes);
app.use('/', homeRoutes);
app.use("/products", productsRoutes);
app.use('/customer', customerRoute);

// ===== Protected Routes =====
app.get('/dashboard', isLoggedIn, authorize(['admin', 'staff']), (req, res) => {
    res.render('dashboard', { user: req.session.user });
});


// Customer only
// app.get('/customer', isLoggedIn, authorize(['customer']), (req, res) => {
//     res.render('customer', { user: req.session.user });
// });
app.get('/customer', isLoggedIn, authorize(['customer']), (req, res) => {
    const db = require('./config/db');
    
    console.log("=== /customer route hit ==="); // เพิ่มบรรทัดนี้
    
    db.all(`
        SELECT products.*, categories.name AS category_name
        FROM products
        JOIN categories ON products.category_id = categories.id
    `, [], (err, rows) => {
        console.log("rows:", rows); // เพิ่มบรรทัดนี้
        console.log("err:", err);   // เพิ่มบรรทัดนี้
        
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render('customer', { 
            user: req.session.user,
            products: rows
        });
    });
});

app.listen(process.env.PORT, () => {
    console.log("Server running on http://localhost:3000");
});