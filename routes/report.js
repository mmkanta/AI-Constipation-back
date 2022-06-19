const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController')
const tokenValidation = require('../middlewares/tokenVerification')

// view history
router.get('/list', tokenValidation, reportController.viewHistory)

// get image
router.get('/image', reportController.getImage)

module.exports = router;