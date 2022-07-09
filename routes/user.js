const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')
const tokenValidation = require('../middlewares/tokenVerification')
const verification = require('../middlewares/verification')

// Create new user (admin)
router.post('/', tokenValidation, verification.adminVerification, userController.create);

// Update user (admin)
router.patch('/', tokenValidation, verification.adminVerification, userController.update);

// Get all users (admin)
router.get('/', tokenValidation, verification.adminVerification, userController.getAll);

// Get user by id
router.get('/:user_id', tokenValidation, verification.userVerification, userController.getById);

// Delete user by id (admin)
router.patch('/delete/:user_id', tokenValidation, verification.adminVerification, userController.deleteById);

module.exports = router;
