const express = require('express');
const router = express.Router();
const stockController = require('../controllers/grnController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_auth = [isLoggedIn, authorize(['admin', 'staff'])];

router.get('/receive', ...check_auth, stockController.showReceive);
router.get('/lookup-sku', ...check_auth, stockController.lookupSku);
router.post('/receive', ...check_auth, express.json(), stockController.receiveStock);

module.exports = router;