const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_auth = [isLoggedIn, authorize(['admin', 'staff'])];

router.get('/', ...check_auth, stockController.showStock);

module.exports = router;