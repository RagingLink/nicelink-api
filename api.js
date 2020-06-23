/**
 * @Author: RagingLink 
 * @Date: 2020-06-22 17:41:47
 * @Last Modified by: RagingLink
 * @Last Modified time: 2020-06-23 19:44:21
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const express = require('express')
var Websocket = require('websocket');
var WebsocketClient = Websocket.client;
let client = new WebsocketClient();
var http = require('http');
var app = express();
var moment = require('moment');
var path = require('path');
const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');
const fs = require('fs');
const shins = require('shins');

var server = http.createServer(app);
app.set('trust proxy', 1)
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

const mongoConn = mongoose.createConnection(`mongodb+srv://brian:w7ZirQhJJazRbWsx@cluster0-lbaa7.gcp.mongodb.net/rate-limiter?retryWrites=true&w=majority`,
    {
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 100,
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true
    }
);

let rateLimiter = new RateLimiterMongo({
    storeClient: mongoConn,
    points: 5,
    duration: 1
});

let rateLimit = async (req, res, next) => {
    rateLimiter.consume(req.ip, 1)
        .then((rateLimitRes) => {
            next();
        }).catch((rateLimitRes) => {
            let rateLimitReset = new Date(Date.now() + rateLimitRes.msBeforeNext)
            res.set({
                "Retry-After": rateLimitRes.msBeforeNext / 1000,
                "X-RateLimit-Limit": 5,
                "X-RateLimit-Remaining": rateLimitRes.remainingPoints,
                "X-RateLimit-Reset": rateLimitReset
            })
            res.type('json');
            let rLimitJson = {
                error: 'Exceeded ratelimit',
                cooldown: rateLimitRes.msBeforeNext,
                message: `Exceeded ratelimit, please try again ${moment(rateLimitReset).fromNow()}`
            };
            res.status(429).send(JSON.stringify(rLimitJson));
        });
};

if (!wsInterval)
    var wsInterval;

let checkInterval = async (ws) => {
    ws.send(JSON.stringify({ type: 'requestShards' }));
}
app.use('*', rateLimit);
app.get('/blargshards', (req, res, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
});
app.get('/', (req, res, next) => {
    res.render('index');
});

let shardData = { data: [] };

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

server.listen(8081, async () => {
    console.log('API now listening on port 8081');
    let mdFile = fs.readFileSync('./views/index.md', 'utf8');
    try {
        shins.render(mdFile, {
            cli: false,
            minify: true,
            customCss: false,
            inline: true,
            unsafe: false,
            'no-links': false,
            logo: './res/nicelinklogo.png'
        }, html => {
            fs.writeFile('./views/index.hbs', html, 'utf8', (err) => {
                if (err)
                    console.error(err);
                console.log('Created index.hbs!');
            });
        });
    } catch (err) {
        console.error(err);
    }
    
});