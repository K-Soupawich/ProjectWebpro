const express = require("express");
const multer = require("multer")
const router = express.Router();
const db = require('../config/db');
const path = require("path")
const productsController = require('../controllers/productsController');
const { isLoggedIn, authorize } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/");
    },

    filename: function (req, file, cb) {
        const colorCode = file.fieldname.replace('colorImage_', '');
        const ext = path.extname(file.originalname); // .png นามสกุลไฟล์
        const name = `tmp_${colorCode}_${Date.now()}${ext}`;
        cb(null, name);
    }
});

const upload = multer({ storage: storage });

const COLORS = ['BK','WT','PK','RD','BL','SK','YL','BR','GN','PP','GR'];
const colorFields = COLORS.map(c => ({ name: `colorImage_${c}`, maxCount: 1 }));

const check_auth = [isLoggedIn, authorize(['admin', 'staff'])];

router.get('/', ...check_auth, productsController.listProducts);
router.get('/add', ...check_auth, productsController.showAdd);
router.post('/add', ...check_auth, upload.fields(colorFields), productsController.createProduct);
router.get('/next-sku', ...check_auth, productsController.getNextSKU);
router.get('/:id/edit', ...check_auth, productsController.showEdit);
router.post('/:id/edit', ...check_auth, upload.fields(colorFields), productsController.updateProduct);
router.post('/:id/delete', ...check_auth, productsController.deleteProduct);

module.exports = router;