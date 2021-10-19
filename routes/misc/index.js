const router = require('express').Router();

router.use('/progressbar', require('./progressbar'));
router.get('/', (req, res) => res.send('Yes'));
module.exports = router;