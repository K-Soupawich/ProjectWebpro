const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grnController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_auth = [isLoggedIn, authorize(['admin', 'staff'])];

router.get('/', ...check_auth, grnController.showReceive);
router.get('/lookup-sku', ...check_auth, grnController.lookupSku);
router.post('/', ...check_auth, grnController.receiveStock);

module.exports = router;