const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/img/profile/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'user_' + req.session.user.id + ext);
    }
});
exports.uploadAvatar = multer({ storage }).single('avatar');

exports.showProfile = (req, res) => {
    const userId = req.session.user?.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, userData) => {
        if (err) return res.status(500).send('Database Error');

        if (req.session.user.role === 'customer') {
            db.all(`
                SELECT o.*, COUNT(oi.id) AS item_count
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE o.user_id = ?
                GROUP BY o.id
                ORDER BY o.created_at DESC
            `, [userId], (err, orders) => {
                if (err) return res.status(500).send('Database Error');
                res.render('profile', { user: req.session.user, userData, orders });
            });
        } else {
            res.render('profile', { user: req.session.user, userData});
        }
    });
};

exports.updateProfile = (req, res) => {
    const { username, email, phone } = req.body;
    const userId = req.session.user?.id;
    if (!userId) return res.redirect('/login');

    const avatarFile = req.file
        ? 'user_' + userId + path.extname(req.file.originalname)
        : null;

    // Save ทับไฟล์เดิม
    if (avatarFile) {
        db.get('SELECT avatar FROM users WHERE id = ?', [userId], (err, row) => {
            if (!err && row?.avatar && row.avatar !== avatarFile) {
                const oldPath = path.join('public/img/profile', row.avatar);
                fs.unlink(oldPath, () => {}); // ลบเงียบ ๆ ไม่ต้อง handle error
            }
        });
    }

    const sql = avatarFile
        ? 'UPDATE users SET username=?, email=?, phone=?, avatar=? WHERE id=?'
        : 'UPDATE users SET username=?, email=?, phone=? WHERE id=?';
    const params = avatarFile
        ? [username, email, phone, avatarFile, userId]
        : [username, email, phone, userId];

    db.run(sql, params, (err) => {
        if (err) return res.status(500).send('Database Error');
        req.session.user.name = username;
        if (avatarFile) req.session.user.avatar = avatarFile;
        res.redirect('/profile');
    });
};
