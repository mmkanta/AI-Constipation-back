const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController')
const tokenValidation = require('../middlewares/tokenVerification')

router.post('/login', authController.login)

router.post('/logout', tokenValidation, authController.logout)

module.exports = router;
