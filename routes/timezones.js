const express = require('express');
const router = express.Router();

var timezones = require('./timezones.json');
var simpleTimezones = timezones.reduce((acc, item) => {
  return acc.push(...item.utc);
}, []);
router.get('/', (req, res) => {
  res.send(JSON.stringify(timezones));
});

router.get('/simple', (req, res) => {

})
router.get('/update', (req, res) => {
  timezones = require('./timezones.json');
  simpleTimezones = timezones.reduce((acc, item) => {
    return acc.push(...item.utc);
  }, []);
  res.send('OK');
});

module.exports = router;