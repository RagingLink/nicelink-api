const express = require('express')
var Websocket = require('websocket');
const { response } = require('express');

var MongoStore = require('rate-limit-mongo');
var RateLimit = require('express-rate-limit');
var moment = require('moment');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();
var http = require('http');
var app = express();
let shardData = { data: [] };

var server = http.createServer(app);

var store = new MongoStore({
    uri: 'mongodb+srv://brian:w7ZirQhJJazRbWsx@cluster0-lbaa7.gcp.mongodb.net/ratelimits?retryWrites=true&w=majority',
    collectionName: 'expressRateLimits'
});

var globalRateLimit = new RateLimit({
    store,
    max: 10 * 1000,
    windowMs: 1000 * 60 * 60,
    handler: (req, res, next) => {
        res.type('json');
        res.send(JSON.stringify(req.rateLimit));
    }
});

var localRateLimit = new RateLimit({
    store,
    max: 5,
    windowMs: 10000,
    handler:  (req, res, next) => {
        res.type('json');
        res.send(JSON.stringify(req.rateLimit));
    }
}); 


app.use('*', globalRateLimit, localRateLimit);
if (!wsInterval)
    var wsInterval;

let checkInterval = async (ws) => {
    ws.send(JSON.stringify({ type: 'requestShards' }));
    console.log('Sent!');
}

app.get('/blargshards', (req, res, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
});
app.get('/', (req, res, next) => {
    res.send('<html><body><h1>Supported endpoints:</h1><ul><li>/blargshards</li></ul></body></html>')
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

    wsInterval = setInterval(checkInterval, 5000, wsClient);
});

client.connect('wss://blargbot.xyz');

server.listen(8081, () => {
    console.log('API now listening on port 8081');
});