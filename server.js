const express = require('express');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/home');
const { isLoggedIn, authorize } = require('./middleware/authMiddleware');

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

//อนุญาตให้เข้าถึงรูปภาพใน public ได้
app.use(express.static('public'))

// ===== ส่ง user ไปทุก view =====
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ===== Public Routes =====
app.use('/', authRoutes);
app.use('/', homeRoutes);

// ===== Protected Routes =====
app.get('/admin', isLoggedIn, authorize(['admin']), (req, res) => {
    res.render('admin', { user: req.session.user });
});

app.get('/staff', isLoggedIn, authorize(['staff']), (req, res) => {
    res.render('staff', { user: req.session.user });
});

app.get('/dashboard', isLoggedIn, authorize(['admin', 'staff']), (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// Customer only
app.get('/customer', isLoggedIn, authorize(['customer']), (req, res) => {
    res.render('customer', { user: req.session.user });
});

app.listen(process.env.PORT, () => {
    console.log("Server running on http://localhost:3000");
});