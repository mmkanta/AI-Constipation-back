const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadFile')
const path = require('path')
const inferController = require('../controllers/inferController')
const tokenValidation = require('../middlewares/tokenVerification')

// image inference
router.post('/image', tokenValidation, upload.single('file'), inferController.imageInfer);

// questionnaire + image inference
router.post('/integrate', tokenValidation, upload.single('file'), inferController.integrateInfer);

// questionnaire inference
router.post('/questionnaire', tokenValidation, inferController.questionnaireInfer);

// generate template
router.get('/template', inferController.generateTemplate)

module.exports = router;