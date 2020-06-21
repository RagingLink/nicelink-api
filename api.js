const express = require('express')
var Websocket = require('websocket');

var WebsocketClient = Websocket.client;
let client = new WebsocketClient();
var http = require('http');
var app = express();
let shardData = { data: [] };

var server = http.createServer(app);
app.set('trust proxy', 1)



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