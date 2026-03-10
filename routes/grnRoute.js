const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grnController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_auth = [isLoggedIn, authorize(['admin', 'staff'])];

router.get('/', ...check_auth, grnController.showReceive);
router.post('/', ...check_auth, express.json(), grnController.receiveStock);
router.get('/lookup-sku', ...check_auth, grnController.lookupSku);

module.exports = router;