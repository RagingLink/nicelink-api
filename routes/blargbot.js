const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
var Websocket = require('websocket');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();

let shardData = { data: [] };
let bent = require("bent");
let { parse } = require("node-html-parser");
let subtagCache = {};

router.get('/shards', (req, res, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
});

client.on('connect', async (wsClient) => {
    let checkInterval = async (ws) => {
        ws.send(JSON.stringify({ type: 'requestShards' }));
    }
    wsClient.on('message', event => {
        if (event.type !== 'utf8')
            return
        let date = JSON.parse(event.utf8Data);
        if (date.code != 'shard')
            return;
        shardData.data[date.data.id] = date.data;
    });
    if (wsInterval)
        clearInterval(wsInterval);
    else
        var wsInterval;

    wsInterval = setInterval(checkInterval, 500, wsClient);
});
router.get("/tags", async (req, res, next) => {
  
let name = req.query.tag;
res.type('json')
if(!name) {
  res.send(JSON.stringify({error: "Tag was not provided", message: "Please provide a name in the tag paramater. Example: ?tag=subtag"}))
  return;
}
let getJson = bent('json');
let tagJson = await getJson('https://blargbot.xyz/tags/json');


let getTags = bent('GET');
let text = await parse(await (await getTags("https://blargbot.xyz/tags")).text())
let matchedTag = tagJson.filter(e => e.name === name.toLowerCase()).shift();

if (!matchedTag) {
  res.send(JSON.stringify({error: "Subtag doesn't exist", message: "This subtag doesn't exist, please provide a valid name."}));
  return;
}

let limits = await text.querySelector('#' + matchedTag.name).parentNode.childNodes.find(c => c.text.startsWith('Limits')).childNodes.map(n => {
  return JSON.stringify({ type: n.childNodes[0].text.substring(11), limits: n.childNodes[1].text.substring(1).trim().split('-').map(i => i.trim()) })
});

matchedTag.limits = limits;
res.send(JSON.stringify(matchedTag, null, 2));
return;
});

client.connect('wss://blargbot.xyz');

module.exports = router;
