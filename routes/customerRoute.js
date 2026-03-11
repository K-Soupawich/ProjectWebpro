const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderControllerC');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const check_Auth = [isLoggedIn, authorize(['customer'])];

router.get('/', ...check_Auth, shopController.showShop);
router.get('/shop', ...check_Auth, shopController.showShop);
router.get('/detail/:id', ...check_Auth, shopController.showDetail);

router.get('/cart', ...check_Auth, cartController.showCart);
router.post('/cart/add', ...check_Auth, cartController.addToCart);
router.post('/cart/update', ...check_Auth, cartController.updateCart);
router.post('/cart/remove', ...check_Auth, cartController.removeFromCart);

router.get('/payment', ...check_Auth, orderController.showPayment);
router.post('/order/place', ...check_Auth, orderController.placeOrder);

module.exports = router;