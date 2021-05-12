const express = require("express");
const router = express.Router();
var proxy = require('express-http-proxy');

//? Decancer route modules
const unorm = require('unorm');
const limax = require('limax');
router.get("/test", (req, res) => {
  setTimeout(() => res.send("OK"), 61000);
});
router.use("/shards", require("./shards"));
router.use("/tags", require("./tags"));
router.use("/stats", require("./stats"));
router.use("/plot", require("./plot"));

router.get('/domains', proxy('https://blargbot.xyz', {
  proxyReqPathResolver: function(req) {
    return '/domains/json';
  }
}));

router.get('/decancer', (req, res) => {
  let text = req.query ? req.query.q || req.query.txt || req.query.text : '';
  text = unorm.nfkd(text);
  text = limax(text, {
      replacement: ' ',
      tone: false,
      separateNumbers: false,
      maintainCase: true,
      custom: ['.', ',', ' ', '!', '\'', '"', '?']
  });
  res.send(text);
});

router.post('/decancer', (req, res) => {
  let text = req.body ? req.body.q || req.body.txt || req.body.text : '';
  text = unorm.nfkd(text);
  text = limax(text, {
      replacement: ' ',
      tone: false,
      separateNumbers: false,
      maintainCase: true,
      custom: ['.', ',', ' ', '!', '\'', '"', '?']
  });
  res.type('json').send(JSON.stringify({
    decancered : text
  }));
})
module.exports = router;
