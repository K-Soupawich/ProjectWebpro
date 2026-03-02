const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const router = express.Router();

// ===== Register Page =====
router.get('/register', (req, res) => {
    res.render('register');
});

// ===== Register =====
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'customer']
        );

        res.redirect('/login');

    } catch (err) {
        res.send("Email already exists");
    }
});

// ===== Login Page =====
router.get('/login', (req, res) => {
    res.render('login');
});

// ===== Login =====
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.send("User not found");
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.send("Wrong password");
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        // Redirect ตาม role
        if (user.role === 'admin') return res.redirect('/admin');
        if (user.role === 'staff') return res.redirect('/staff');

        res.redirect('/'); // customer

    } catch (err) {
        res.send("Login error");
    }
});

// ===== Logout =====
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;