const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_Auth = [isLoggedIn, authorize(['customer'])];

router.get('/', ...check_Auth, customerController.showShop);
router.get('/shop', ...check_Auth, customerController.showShop);
router.get('/detail/:id', ...check_Auth, customerController.showDetail);

router.get('/cart', ...check_Auth, customerController.showCart);
router.post('/cart/add', ...check_Auth, customerController.addToCart);
router.post('/cart/update', ...check_Auth, customerController.updateCart);
router.post('/cart/remove', ...check_Auth, customerController.removeFromCart);

router.post('/order/place', ...check_Auth, customerController.placeOrder);
router.get( '/order/:id', ...check_Auth, customerController.showOrder);
router.get( '/orders', ...check_Auth, customerController.showOrders);

router.get('/profile', ...check_Auth, customerController.showProfile);
router.post('/update-profile', ...check_Auth, customerController.updateProfile);

module.exports = router;