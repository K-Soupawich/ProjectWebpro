const express = require('express');
const session = require('express-session');
require('dotenv').config();

const authRoute = require('./routes/authRoute');
const homeRoute = require('./routes/homeRoute');
const customerRoute = require('./routes/customerRoute');
const productsRoute = require('./routes/productsRoute');
const stockRoute = require('./routes/stockRoute');
const grnRoute = require('./routes/grnRoute');
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

// ===== ส่ง user ไปทุก view =====
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use('/', authRoute);
app.use('/', homeRoute);
app.use('/customer', customerRoute);
app.use('/products', productsRoute);
app.use('/stock', stockRoute);
app.use('/grn', grnRoute);

app.get('/dashboard', isLoggedIn, authorize(['admin', 'staff']), (req, res) => {
    res.render('dashboard', { 
        user: req.session.user,
        currentPage: 'dashboard'
    });
});

app.listen(process.env.PORT, () => {
    console.log("Server running on http://localhost:3000");
});