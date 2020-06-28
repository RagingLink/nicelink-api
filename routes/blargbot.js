const express = require('express');
const router = express.Router()
var Websocket = require('websocket');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();

let shardData = { data: [] };

router.get('/shards', (res, req, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
});

client.on('connect', async (wsClient) => {
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

    wsInterval = setInterval(checkInterval, 5000, wsClient);
});

client.connect('wss://blargbot.xyz');

module.exports = router;