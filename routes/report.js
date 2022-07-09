const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController')
const tokenValidation = require('../middlewares/tokenVerification')
const verification = require('../middlewares/verification')

// update report by id
router.patch('/', tokenValidation, verification.clinicianVerification, reportController.update)

// get all reports
router.get('/list', tokenValidation, reportController.viewResult)

// get image by report id
router.get('/image', reportController.getImage)

// delete report by id
router.delete('/delete/:report_id', tokenValidation, verification.clinicianVerification, reportController.deleteById)

// get report by id
router.get('/:report_id', tokenValidation, reportController.getById)

module.exports = router;