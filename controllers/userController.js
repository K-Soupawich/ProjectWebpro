const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.showUsers = (req, res) => {
    db.all(`SELECT id, username, email, phone, role, avatar, created_at FROM users ORDER BY created_at DESC`, [], (err, users) => {
        if (err) return res.send('Database error');

        db.get(`SELECT MAX(id) as maxId FROM users`, [], (err2, row) => {
            const nextId = (row?.maxId || 0) + 1;
            res.render('users', {
                users,
                nextId,
                currentUser: req.session.user,
                currentPage: 'users',
                success: req.query.success || null,
                error: req.query.error || null
            });
        });
    });
};

exports.createUser = async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return res.redirect('/users?error=กรุณากรอกข้อมูลให้ครบ');
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            [username.trim(), email.trim().toLowerCase(), hashed, role],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.redirect('/users?error=ชื่อผู้ใช้หรืออีเมลซ้ำในระบบ');
                    }
                    return res.redirect('/users?error=เกิดข้อผิดพลาด กรุณาลองใหม่');
                }
                res.redirect('/users?success=สร้างผู้ใช้ ' + username + ' เรียบร้อยแล้ว');
            }
        );
    } catch (e) {
        res.redirect('/users?error=เกิดข้อผิดพลาด');
    }
};

exports.updateUser = async (req, res) => {
    const { id, username, email, phone, role, newPassword } = req.body;

    try {
        if (newPassword && newPassword.trim() !== '') {
            const hashed = await bcrypt.hash(newPassword.trim(), 10);
            db.run(
                `UPDATE users SET username=?, email=?, phone=?, role=?, password=? WHERE id=?`,
                [username.trim(), email.trim().toLowerCase(), phone || null, role, hashed, id],
                function(err) {
                    if (err) return res.redirect('/users?error=เกิดข้อผิดพลาด กรุณาลองใหม่');
                    res.redirect('/users?success=อัปเดตผู้ใช้เรียบร้อยแล้ว');
                }
            );
        } else {
            db.run(
                `UPDATE users SET username=?, email=?, phone=?, role=? WHERE id=?`,
                [username.trim(), email.trim().toLowerCase(), phone || null, role, id],
                function(err) {
                    if (err) return res.redirect('/users?error=เกิดข้อผิดพลาด กรุณาลองใหม่');
                    res.redirect('/users?success=อัปเดตผู้ใช้เรียบร้อยแล้ว');
                }
            );
        }
    } catch (e) {
        res.redirect('/users?error=เกิดข้อผิดพลาด');
    }
};

exports.deleteUser = (req, res) => {
    const { id } = req.body;

    if (parseInt(id) === req.session.user.id) {
        return res.redirect('/users?error=ไม่สามารถลบบัญชีของตัวเองได้');
    }

    db.run(`DELETE FROM users WHERE id=?`, [id], function(err) {
        if (err) return res.redirect('/users?error=เกิดข้อผิดพลาด');
        res.redirect('/users?success=ลบผู้ใช้เรียบร้อยแล้ว');
    });
};
