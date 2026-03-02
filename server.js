const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const { isLoggedIn, authorize } = require('./middleware/authMiddleware');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

require('dotenv').config();
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

// ===== Routes =====
app.use('/', authRoutes);

// ===== Protected Routes =====
app.get('/admin', isLoggedIn, authorize('admin'), (req, res) => {
    res.send("Admin Dashboard");
});

app.get('/staff', isLoggedIn, authorize('staff'), (req, res) => {
    res.send("Staff Dashboard");
});

app.get('/customer', isLoggedIn, authorize('customer'), (req, res) => {
    res.send("Customer Dashboard");
});

app.listen(process.env.PORT, () => {
    console.log("Server running on http://localhost:3000");
});