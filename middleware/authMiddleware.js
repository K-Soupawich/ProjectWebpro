function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function authorize(role) {
    return (req, res, next) => {
        if (!req.session.user || req.session.user.role !== role) {
            return res.send("Access Denied");
        }
        next();
    };
}

module.exports = { isLoggedIn, authorize };