const express = require("express");
const router = express.Router();

let bent = require("bent");
let { parse } = require("node-html-parser");
let subtagCache = {};
let tagJson = require(__dirname + "/../tags.json");
const fs = require("fs");

router.get("/", async (req, res, next) => {
  let sent;
  res.type("json");
  let name = req.query.tag;

  if (!name) {
    res.send(JSON.stringify(Object.values(tagJson), null, 2));
    return;
  }

  let getJson = bent("json");
  let newTagJson = Object.values(await require('bent')('https://beta.blargbot.xyz/api/subtags', 'json')()).reduce((acc, item) => {
    acc.push(...item.el)
    return acc;
    }, []);
  let getTags = bent("GET");
  let tagList = await parse(
    await (await getTags("https://blargbot.xyz/tags")).text()
  );
  let matchedTag = newTagJson
    .filter((e) => e.name === name.toLowerCase())
    .shift();
  if (!matchedTag) {
    res.send(
      JSON.stringify({
        error: "Subtag doesn't exist",
        message:
          "This subtag doesn't exist, please provide a valid name.",
      })
    );
    return;
  }

  if (subtagCache[name]) {
    res.status(200).send(JSON.stringify(matchedTag, null, 2));
    sent = true;
  }
  if (tagJson[name] && !sent) {
    res.status(200).send(JSON.stringify(tagJson[name], null, 2));
    sent = true;
  }



  matchedTag.limits = limits;
  matchedTag.deprecated = deprecated;
  subtagCache[matchedTag.name] = matchedTag;
  tagJson[matchedTag.name] = matchedTag;

  fs.writeFile(
    __dirname + "/../tags.json",
    JSON.stringify(tagJson),
    "utf8",
    (err, data) => {
      if (sent) return;
      if (err) {
        console.error(err);
        res
          .status(500)
          .send(
            JSON.stringify({ message: "An internal server error occurred" })
          );
      } else {
        res.status(200).send(JSON.stringify(matchedTag));
      }
    }
  );
});

router.get('/json', async (req, res, next) => {
  let getJson = bent("json");
  let newTagJson = await getJson("https://blargbot.xyz/tags/json");
  return res.type('json').send(JSON.stringify(newTagJson, null, 2));
})
module.exports = router;
