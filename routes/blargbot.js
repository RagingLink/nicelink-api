const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
var Websocket = require('websocket');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();

let shardData = { data: [] };

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
  if(!req.query.xpath) req.query.xpath = '//';

  try {
    const browser = await puppeteer.launch({headless: false, args : ["--no-sandbox"]});
    const [page] = await browser.pages();

    await page.goto('https://blargbot.xyz/tags');

    const data = await page.evaluate(() => {
      return document.querySelector(req.query.xpath).innerText;
    });

    res.send(JSON.stringify(data));

    await browser.close();
  } catch (err) {
    console.error(err);
    res.send(JSON.stringify(err));
  }
});

client.connect('wss://blargbot.xyz');

module.exports = router;
