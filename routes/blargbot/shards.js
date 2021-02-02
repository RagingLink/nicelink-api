const express = require("express");
const router = express.Router();

var WebSocket = require("ws");
var rWebSocket = require("reconnecting-websocket");
const { parse } = require("path");
const bigInteger = require("big-integer");
const bent = require("bent");
const getString = bent("string");
//Initialize shardData object
let shardData = { data: [], date: [], meta: {} };

//Start websocket
let wss = new rWebSocket("wss://blargbot.xyz", [], { WebSocket });
wss.addEventListener("open", (ws) => {
  console.info("Connected to wss://blargbot.xyz");
  //Update metadata after 20 seconds due to the way blargbot sends shard data
  setTimeout(updateMeta, 1000 * 20);
});

let clusterTimeouts = {};

//Shard data blargbot sends in cluster chunks
wss.addEventListener("message", (event) => {
  let data = JSON.parse(event.data);
  if (data.code != "shard") return;
  let cluster = data.data;
  shardData.data[cluster.id] = cluster;
  
  /*Clear data of cluster after 15 minutes have passed, if a cluster is unresponsive it will still send messages
    this is mostly for removing clusters that are unused*/
  if(clusterTimeouts[cluster.id]) clearTimeout(clusterTimeouts[cluster.id]);

  clusterTimeouts[cluster.id] = setTimeout(() => {
    delete shardData.data[cluster.id];
    console.info('Deleted cluster '+cluster.id+ ' from the shardData object')
  }, 15 * 1000 * 60)
});

//Metadata update function for /shards/meta
let updateMeta = async () => {
  shardData.meta["shards"] = Object.values(shardData.data).reduce((a, c) => {
    return c.shards.length + a;
  }, 0);
  shardData.meta["clusters"] = Object.keys(shardData.data).length;
  shardData.meta["lastMetaUpdate"] = Date.now();
  shardData.meta["shardsPerCluster"] = shardData.data[0].shards.length;
  shardData.meta["guilds"] = Object.values(shardData.data).reduce((a, c) => {
    return c.guilds + a;
  }, 0);
  shardData.meta["memory"] = Object.values(shardData.data).reduce((a, c) => {
    return c.rss + a;
  }, 0);
  shardData.meta["averageCPU"] = Object.values(shardData.data).reduce((a, c) => {
    return c.cpu + a
  }, 0) / Object.keys(shardData.data).length;
  try {
    let metrics = await getString("https://blargbot.xyz/metrics");
    let users = metrics.match(/bot_user_gauge (\d+)/);
    shardData.meta["users"] = users
      ? !isNaN(parseInt(users[1]))
        ? parseInt(users[1])
        : null
      : null;
  } catch (e) {}
};
//Update metadata every minute
setInterval(updateMeta, 1000 * 60);

//If multiple params are provided, prioritize the one higher in order: down -> guild -> cluster -> shard
router.get("/", (req, res) => {
  res.type("json");
  //Returns only downed shards
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
  //Return {"cluster" : {...}, "shard" : {...}} of provided guild
  if (req.query.guild) {
    let id;
    try {
      id = bigInteger(req.query.guild);
    } catch (e) {
      return res.status(400).send(
        JSON.stringify({
          error: "Invalid guild",
          message: `${req.query.guild} is an invalid number, please try again`,
        })
      );
    }
    let shard = id.shiftRight(22).mod(parseInt(shardData.meta.shards));
    let cluster = Math.floor(shard / shardData.meta.shardsPerCluster);
    return res.send(
      JSON.stringify(
        {
          shard:
            shardData.data[cluster].shards[
              shard % shardData.meta.shardsPerCluster
            ],
          cluster: shardData.data[cluster],
        },
        null,
        2
      )
    );
  }
  //Return {"id" : cluster, ...} of provided cluster
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
            message: `${req.query.cluster} is an invalid number, please try again.`,
          },
          null,
          2
        )
      );
    }
  }
  //Return {"id" : "shard", ...} ofp provided shard
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
            message: `${req.query.shard} is an invalid number, please try again.`,
          },
          null,
          2
        )
      );
    }
  }
  //Return array of cluster objects
  res.send(JSON.stringify(Object.values(shardData.data), null, 2));
  // let updateDates = Object.values(shardData.date);
  // let oldestUpdate = updateDates.slice(0).sort((a, b) => (a > b ? 1 : -1));
  // let newestUpdate = updateDates.slice(0).sort((a, b) => (a < b ? 1 : -1));
  // console.info(`Oldest cluster update was at ${moment.unix(oldestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
  // console.info(`Newest update was at ${moment.unix(newestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
});
//Return metadata
router.get("/meta", async (req, res) => {
  res.type("json");
  res.send(JSON.stringify(shardData.meta, null, 2));
  //TRY
  try {
    await updateMeta();
  } catch (e) {}
});

module.exports = router;