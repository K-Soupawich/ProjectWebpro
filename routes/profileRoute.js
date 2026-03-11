const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/authMiddleware');
const { uploadAvatar, showProfile, updateProfile } = require('../controllers/profileController');

router.get('/', isLoggedIn, showProfile);
router.post('/update', isLoggedIn, uploadAvatar, updateProfile);

module.exports = router;
