const express = require('express')
var Websocket = require('websocket');
const { response } = require('express');
var ExpressBrute = require('express-brute'),
    MongoStore = require('express-brute-mongo'),
    MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();
var http = require('http');
var app = express();
let shardData = { data: [] };

var server = http.createServer(app);

var store = new MongoStore(function (ready) {
    MongoClient.connect('mongodb+srv://brian:w7ZirQhJJazRbWsx@cluster0-lbaa7.gcp.mongodb.net/?retryWrites=true&w=majority', {
        useUnifiedTopology: true,
        useNewUrlParser: true
    }, function (err, mongoClient) {
        if (err) console.error(err);
        let db = mongoClient.db('ratelimits');
        ready(db.collection('bruteforce-store'));
    });
});

let failCallback = function (req, res, next, nextValidRequestDate) {
    res.type('json');
    let error = {
        message: "You've made too many failed attempts in a short period of time, please try again " + moment(nextValidRequestDate).fromNow(),
        type: 'ratelimit',
        cooldown: parseInt(moment(nextValidRequestDate).format('x') - moment.now())
    }
    res.status(429).send(JSON.stringify(error));
};

var handleStoreError = function (error) {
    console.error(error); // log this error so we can figure out what went wrong
};

var localBruteforce = new ExpressBrute(store, {
    freeRetries: 5,
    minWait: 500,
    maxWait: 10000,
    failCallback,
    handleStoreError
});

var globalBruteforce = new ExpressBrute(store, {
    freeRetries: 1000,
    minWait: 1000 * 60,
    maxWait: 1000 * 60 * 5,
    lifetime: 60 * 60 * 6,
    attachResetToRequest: false,
    refreshTimeoutOnRequest: false,
    failCallback,
    handleStoreError
});

app.use('*', globalBruteforce.prevent, localBruteforce.getMiddleware());
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