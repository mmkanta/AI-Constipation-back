const express = require('express');
const router = express.Router();

const user = require('./user')
const auth = require('./authentication')
// const vitalsProject = require('./vitals')
// const project = require('./project')
const infer = require('./infer')
// const image = require('./image')
// const mask = require('./masks')
// const pacs = require('./pacs')
const report = require('./report')

// const example = require('./example')

router.use('/api/users', user);
router.use('/api/auth', auth);
// router.use('/api/projects/', project);
// router.use('/api/vitals/', vitalsProject);
router.use('/api/infer/', infer)
// router.use('/api/image/', image)
// router.use('/api/masks/', mask)
// router.use('/api/pacs/', pacs)
router.use('/api/reports/', report)

// router.use('/api/example/', example)

// Express default homepage
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
