const express = require("express");
const router = express.Router();

let bent = require("bent");
let { parse } = require("node-html-parser");
let subtagCache = {};
let tagJson = require(__dirname + "../tags.json");
const fs = require("fs");

router.get("/tags", async (req, res, next) => {
  let sent;
  res.type("json");
  let name = req.query.tag;
  let update = req.query.update;

  if (!name) {
    res.send(JSON.stringify(Object.values(tagJson), null, 2));
    return;
  }

  let getJson = bent("json");
  let newTagJson = await getJson("https://blargbot.xyz/tags/json");
  let getTags = bent("GET");
  let text = await parse(
    await (await getTags("https://blargbot.xyz/tags")).text()
  );
  let matchedTag = Object.values(newTagJson)
    .filter((e) => e.name === name.toLowerCase())
    .shift();
  if (!matchedTag) {
    res.send(
      JSON.stringify({
        error: "Subtag doesn't exist",
        message:
          "This subtag doesn't exist, please provide a valid name. If you believe this is a bug please try providing the `update=true` parameter to the url",
      })
    );
    return;
  }

  if (subtagCache[name]) {
    res.status(200).send(JSON.stringify(subtagCache[name], null, 2));
    sent = true;
  }
  if (tagJson[name]) {
    res.status(200).send(JSON.stringify(tagJson[name], null, 2));
    sent = true;
  }

  let querySelector = await text.querySelector("#" + matchedTag.name);
  let limitsQuery = await querySelector.parentNode.childNodes.find((c) =>
    c.text.startsWith("Limits")
  );
  let deprecatedQuery = await querySelector.parentNode.childNodes.find((c) =>
    c.classNames.includes("tagdeprecated")
  );

  let deprecated = !!deprecatedQuery
    ? {
        isDeprecated: true,
        replacement: !!/Please use (\w*) instead/gim.exec(deprecatedQuery.text)
          ? /Please use (\w*) instead/gim.exec(deprecatedQuery.text).pop()
          : null,
      }
    : { isDeprecated: false };
  let limits = !!limitsQuery
    ? limitsQuery.childNodes.map((n) => {
        return {
          type: n.childNodes[0].text.substring(11),
          limits: n.childNodes[1].text
            .trim()
            .split("-")
            .map((i) => i.trim())
            .filter((i) => i),
        };
      })
    : [];

  matchedTag.limits = limits;
  matchedTag.deprecated = deprecated;
  subtagCache[matchedTag.name] = matchedTag;
  tagJson[matchedTag.name] = matchedTag;

  fs.writeFile(
    __dirname + "..//tags.json",
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
