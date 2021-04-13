const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  setTimeout(() => res.send("OK"), 61000);
});
router.use("/shards", require("./shards"));
router.use("/tags", require("./tags"));
router.use("/stats", require("./stats"));
router.use("/plot", require("./plot"));
module.exports = router;
