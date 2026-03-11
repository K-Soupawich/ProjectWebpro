const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.showLogin = (req, res) => {
    res.render('login', { 
        error: req.query.error || null,
        success: req.query.success || null 
    });
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.register = async (req, res) => {
    const { username, phone, email, password, confirm_password} = req.body;

    if (password !== confirm_password) {
        return res.redirect('/login?error=รหัสผ่านไม่ตรงกัน');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (username, phone, email, password, avatar) VALUES (?, ?, ?, ?, ?)", [username, phone, email, hashedPassword, 'default.png'],
        function(err) {
            if (err) {
                console.log(err);
            }
            res.redirect('/login');
        }
    );

};

exports.login = async (req, res) => {
    const { identity, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ? OR email = ?", [identity, identity], async (err, user) => {
        if (!user) return res.redirect('/login?error=ไม่พบบัญชีผู้ใช้นี้');

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.redirect('/login?error=รหัสผ่านไม่ถูกต้อง');

        req.session.user = {
            id: user.id,
            name: user.username,
            role: user.role,
            avatar: user.avatar || 'default.jpg'
        };

        if (user.role === 'admin' || user.role === 'staff') {
            return res.redirect('/dashboard');
        }

        res.redirect('/customer/shop'); // customer
    });
}

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};