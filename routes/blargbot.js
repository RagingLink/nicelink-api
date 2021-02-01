const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  setTimeout(() => res.send("OK"), 61000);
});
router.use('/shards', require('./blargbot/shards'));
router.use("/tags", require("./blargbot/tags"));

module.exports = router;
