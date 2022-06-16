const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadFile')
const path = require('path')
const inferController = require('../controllers/inferController')

router.post('/image', upload.single('file'), inferController.imageInfer);

router.post('/questionnaire', inferController.questionnaireInfer);

module.exports = router;