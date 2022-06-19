const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadFile')
const path = require('path')
const inferController = require('../controllers/inferController')
const tokenValidation = require('../middlewares/tokenVerification')

// questionnaire inference
router.post('/image', tokenValidation, upload.single('file'), inferController.imageInfer);

// image inference
router.post('/questionnaire', tokenValidation, inferController.questionnaireInfer);

module.exports = router;