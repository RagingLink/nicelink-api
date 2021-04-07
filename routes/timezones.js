const express = require('express');
const router = express.Router();

var timezones = require('./timezones.json');

router.get('/', (req, res) => {
  res.send(JSON.stringify(timezones));
});

router.get('/update', (req, res) => {
  timezones = require('./timezones.json');
  res.send('OK');
});

module.exports = router;