const express = require("express");
const router = express.Router();
var WebSocket = require("ws");
var rWebSocket = require("reconnecting-websocket");
var moment = require("moment");
const { parse } = require("path");
const bigInteger = require('big-integer');

let shardData = { data: [], date: [], meta: {} };

let wss = new rWebSocket("wss://blargbot.xyz", [], { WebSocket });
wss.addEventListener("open", (ws) => {
  console.info("Connected to wss://blargbot.xyz");
  setTimeout(updateMeta, 1000 * 30);
});

wss.addEventListener("message", (event) => {
  let data = JSON.parse(event.data);
  if (data.code != "shard") return;
  shardData.data[data.data.id] = data.data;
  shardData.date[data.data.id] = Math.floor(new Date() / 1000);
});

let updateMeta = () => {
  shardData.meta["shards"] = Object.values(shardData.data).reduce((a, c) => {
    return c.shards.length + a;
  }, 0);
  shardData.meta["clusters"] = Object.values(shardData.data).length;
  shardData.meta["lastMetaUpdate"] = Date.now();
  shardData.meta["shardsPerCluster"] = shardData.data[0].shards.length;

};
setInterval(updateMeta, 1000 * 60 * 30);

router.get("/shards", (req, res) => {
  res.type("json");
  if (req.query.down && !!req.query) {
    let output = Object.values(JSON.parse(JSON.stringify(shardData.data)))
      .map((cluster) => {
        cluster.shards = cluster.shards
          .map((shard) => {
            return shard.status != "ready" ? shard : false;
          })
          .filter((i) => i);
        return cluster;
      })
      .filter((c) => c.shards.length != 0);
    return res.send(JSON.stringify(output, null, 2));
  }

  if (req.query.cluster) {
    if (!isNaN(parseInt(req.query.cluster))) {
      let cluster = parseInt(req.query.cluster);
      if (!shardData.data[cluster]) {
        return res.status(400).send(
          JSON.stringify(
            {
              error: "Invalid cluster",
              message: `Cluster ${cluster} doesn't exist, please try again`,
            },
            null,
            2
          )
        );
      }
      return res.send(JSON.stringify(shardData.data[cluster], null, 2));
    } else {
      res.status(400).send(
        JSON.stringify(
          {
            error: "Invalid number",
            message: `${req.query.cluster} is not a valid number, please try again.`,
          },
          null,
          2
        )
      );
    }
  }

  if (req.query.shard) {
    if (!isNaN(parseInt(req.query.shard))) {
      let shard = parseInt(req.query.shard);
      let maxShards = Object.values(shardData.data).reduce((a, c) => {
        return c.shards.length + a;
      }, 0);
      if (shard >= maxShards) {
        return res.status(400).send(
          JSON.stringify(
            {
              error: "Invalid shard",
              message: `Shard ${shard} doesn't exist, please try again`,
            },
            null,
            2
          )
        );
      }
      let perCluster = shardData.data[0].shards.length;
      let shardJSON = shardData.data[
        Math.floor(shard / perCluster)
      ].shards.find((i) => i.id == shard);
      return res.send(JSON.stringify(shardJSON, null, 2));
    } else {
      res.status(400).send(
        JSON.stringify(
          {
            error: "Invalid number",
            message: `${req.query.shard} is not a valid number, please try again.`,
          },
          null,
          2
        )
      );
    }
  }

  if(req.query.guild) {
    let id;
    try {
      id = bigInteger(req.query.guild);        
    } catch(e) {
      return res.status(400).send(JSON.stringify({
        error: 'Invalid guild',
        message: `${req.query.guild} is an invalid integer, please try again`
      }))  
    }
    let shard = id.shiftRight(22).mod(parseInt(shardData.meta.shards));
    let cluster = Math.floor(shard / shardData.meta.shardsPerCluster);
    return res.send(JSON.stringify({
      shard: shardData.data[cluster].shards[shard % shardData.meta.shardsPerCluster],
      cluster : shardData.data[cluster], 
      meta : shardData.meta
    }))
  }
  res.send(JSON.stringify(Object.values(shardData.data), null, 2));
  // let updateDates = Object.values(shardData.date);
  // let oldestUpdate = updateDates.slice(0).sort((a, b) => (a > b ? 1 : -1));
  // let newestUpdate = updateDates.slice(0).sort((a, b) => (a < b ? 1 : -1));
  //    console.info(`Oldest cluster update was at ${moment.unix(oldestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
  //  console.info(`Newest update was at ${moment.unix(newestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
});

router.get("/shards/meta", (req, res) => {
  res.type("json");
  res.send(JSON.stringify(shardData.meta, null, 2));
   //TRY
   try {
    updateMeta();
  } catch (e) {}
});
router.get("/test", (req, res) => {
  setTimeout(() => res.send("OK"), 61000);
});
//let wsInterval;
router.use("/tags", require("./blargbot/tags.js"));

module.exports = router;
