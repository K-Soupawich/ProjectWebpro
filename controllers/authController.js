const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.showLogin = (req, res) => {
    res.render('login');
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.register = async (req, res) => {
    const { username, email, password, confirm_password} = req.body;

    if (password !== confirm_password) {
        return res.send("Passwords do not match");
    }

    console.log(username, email, password);
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword],
        function(err) {
            if (err) {
                console.log(err);
                alert("User already exist");
                // return res.send("Error: " + err.message);
                // return res.send("User already exist");
            }
            res.redirect('/login');
        }
    );

};

exports.login = async (req, res) => {
    const { identity, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ? OR email = ?", [identity, identity], async (err, user) => {
        if (!user) {
            return res.send("User not found");
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send("Wrong password");
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        if (user.role === 'admin' || user.role === 'staff') {
            return res.redirect('/dashboard');
        }

        res.redirect('/'); // customer
    });
}

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};