const express = require("express");
const router = express.Router();

var timezones = require("./timezones.json");
var simpleTimezones = timezones
  .reduce((acc, item) => {
    acc.push(...item.utc);
    return acc;
  }, [])
  .filter((item, index, self) => self.indexOf(item) === index);
router.get("/", (req, res) => {
  if (!(req.query && req.query.q)) {
    return res.type("json").send(JSON.stringify(timezones, null, 2));
  }
  let query = req.query.q.toLowerCase();
  let timeCodes = simpleTimezones.filter((item) => {
    return item.toLowerCase().includes(query);
  });
  if (timeCodes.length === 1) {
    return res.send(timeCodes[0]);
  }
  let timeTexts = timezones.filter((item) => {
    return item.text.match(/\(UTC.*\)/).includes(query);
  });
  if (timeTexts.length > 0) {
    if (timeTexts.length === 1) {
      return res.type('json').send(JSON.stringify(timeTexts[0], null, 2));
    };
    return res.type('json').send(JSON.stringify(timeTexts, null, 2));
  };

  let matches = timezones.filter((item) => {
    if (item.value.toLowerCase().includes(query)) return true;
    if (item.abbr.toLowerCase().includes(query)) return true;
    if (item.offset == query) return true;
    if (item.utc.join(",").toLowerCase().includes(query)) return true;
  });
  return res.type("json").send(JSON.stringify(matches, null, 2));
});

router.get("/simple", (req, res) => {
  res.type("json").send(JSON.stringify(simpleTimezones, null, 2));
});

router.get("/update", (req, res) => {
  timezones = require("./timezones.json");
  simpleTimezones = timezones
    .reduce((acc, item) => {
      return acc.push(...item.utc);
    }, [])
    .filter((item, index, self) => self.indexOf(item) === index);
  res.send("OK");
});

module.exports = router;
