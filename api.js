/**
 * @Author: RagingLink
 * @Date: 2020-06-22 17:41:47
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-01-27 19:55:43
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const express = require("express");
var http = require("http");
var app = express();
var moment = require("moment");
var path = require("path");
const { RateLimiterMongo } = require("rate-limiter-flexible");
const mongoose = require("mongoose");
const fs = require("fs");
const shins = require("shins");
const CatLoggr = require("cat-loggr");
const bodyparser = require("body-parser");

var server = http.createServer(app);
app.set("trust proxy", 1);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
let docsViews = ["index", "blargbot"];
let renderDocs = (view) => {
  let mdFile = fs.readFileSync("./views/" + view + ".md", "utf8");
  try {
    shins.render(
      mdFile,
      {
        cli: false,
        minify: true,
        customCss: false,
        inline: true,
        unsafe: false,
        "no-links": false,
        logo: "./res/nicelinklogo.png",
      },
      (err, html) => {
        fs.writeFile("./views/" + view + ".hbs", html, "utf8", (err) => {
          if (err) console.error(err);
          console.log("Created " + view + ".hbs!");
        });
      }
    );
  } catch (err) {
    console.error(err);
  }
};
// parse application/x-www-form-urlencoded
app.use(bodyparser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyparser.json());
const loggr = new CatLoggr({
  levels: [
    { name: "error", color: CatLoggr._chalk.black.bgRed },
    { name: "info", color: CatLoggr._chalk.black.bgGreen, aliases: ["log"] },
  ],
}).setGlobal();
const mongoConn = mongoose.createConnection(
  `mongodb+srv://brian:w7ZirQhJJazRbWsx@cluster0-lbaa7.gcp.mongodb.net/rate-limiter?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  }
);

let rateLimiter = new RateLimiterMongo({
  storeClient: mongoConn,
  points: 25,
  duration: 1,
});

let rateLimit = async (req, res, next) => {
  rateLimiter
    .consume(req.ip, 1)
    .then((rateLimitRes) => {
      next();
    })
    .catch((rateLimitRes) => {
      let rateLimitReset = new Date(Date.now() + rateLimitRes.msBeforeNext);
      res.set({
        "Retry-After": rateLimitRes.msBeforeNext / 1000,
        "X-RateLimit-Limit": 5,
        "X-RateLimit-Remaining": rateLimitRes.remainingPoints,
        "X-RateLimit-Reset": rateLimitReset,
      });
      res.type("json");
      let rLimitJson = {
        error: "Exceeded ratelimit",
        cooldown: rateLimitRes.msBeforeNext,
        message: `Exceeded ratelimit, please try again ${moment(
          rateLimitReset
        ).fromNow()}`,
      };
      res.status(429).send(JSON.stringify(rLimitJson));
    });
};

//app.use('*', rateLimit);
app.use("/blargbot", require("./routes/blargbot"));
app.get("/(docs)?", (req, res, next) => {
  res.render("index");
});
app.get("/docs/:page", async (req, res, next) => {
  let dirs = await fs.readdirSync("./views");
  dirs = dirs.filter((f) => f.endsWith(".hbs")).map((f) => f.split(".")[0]);
  if (!dirs.includes(req.params.page))
    return res.send("This docs page doesn't exist");
  res.render(req.params.page);
});
server.listen(8081, async () => {
  console.log("API now listening on port 8081");
  docsViews.forEach(renderDocs);
});
