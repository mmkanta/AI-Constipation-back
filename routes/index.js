const express = require('express');
const router = express.Router();

const user = require('./user')
const auth = require('./authentication')
const infer = require('./infer')
const report = require('./report')

router.use('/api/users', user);
router.use('/api/auth', auth);
router.use('/api/infer/', infer)
router.use('/api/reports/', report)

// Express default homepage
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
