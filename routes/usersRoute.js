const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const adminOnly = [isLoggedIn, authorize(['admin'])];

router.get('/', ...adminOnly, userController.showUsers);
router.post('/create', ...adminOnly, userController.createUser);
router.post('/update', ...adminOnly, userController.updateUser);
router.post('/delete', ...adminOnly, userController.deleteUser);

module.exports = router;
