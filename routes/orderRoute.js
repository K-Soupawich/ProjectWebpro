const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderControllerS');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_auth = [isLoggedIn, authorize(['staff'])];

router.get('/', ...check_auth, orderController.showOrders);
router.get('/:id/items', ...check_auth, orderController.getOrderItems);
router.post('/:id/status' ,...check_auth, orderController.updateStatus);

module.exports = router;