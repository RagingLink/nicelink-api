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
let tagJson = require('../tags.json');
const { fstat } = require('fs');
const fs = require('fs');
let path = require('path');

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
    res.type('json')
    let name = req.query.tag;
    let update = req.query.update;

    if (!name) {
        res.send(JSON.stringify({ error: "Tag was not provided", message: "Please provide a name in the tag paramater. Example: ?tag=subtag" }))
        return;
    }
    let getJson = bent('json');
    let tagJson = await getJson('https://blargbot.xyz/tags/json');
    let getTags = bent('GET');
    let text = await parse(await (await getTags("https://blargbot.xyz/tags")).text())
    let matchedTag = tagJson.filter(e => e.name === name.toLowerCase()).shift();
    //console.log('init match')
    if (!matchedTag) {
        res.send(JSON.stringify({ error: "Subtag doesn't exist", message: "This subtag doesn't exist, please provide a valid name." }));
        return;
    }

    let querySelector = await text.querySelector('#' + matchedTag.name);

    if (update) {
        let limitsQuery = await querySelector.parentNode.childNodes.find(c => c.text.startsWith('Limits'));
        let deprecatedQuery = await querySelector.parentNode.childNodes.find(c => c.classNames.includes('tagdeprecated'));

        let deprecated = !!deprecatedQuery ? { isDeprecated: true, replacement: /Please use (\w*) instead/gmi.exec(deprecatedQuery.text).pop() } : { isDeprecated: false };
        let limits = !!limitsQuery ? limitsQuery.childNodes.map(n => {
            return { type: n.childNodes[0].text.substring(11), limits: n.childNodes[1].text.substring(1).trim().split('-').map(i => i.trim()) }
        }) : [];

        //console.log('Limits')
        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile('../tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.log(err)
            } else {
                res.send(JSON.stringify({ updated: true, message: 'Updated ' + matchedTag.name + ' succesfully!' }))
            }

        });
    } else {

        if (subtagCache[name]) {
            res.send(JSON.stringify(subtagCache[name], null, 2));
            return;
        };
        if (tagJson[name]) {
            res.send(JSON.stringify(tagJson[name], null, 2));
            return;
        }

        let limitsQuery = await querySelector.parentNode.childNodes.find(c => c.text.startsWith('Limits'));
        let deprecatedQuery = await querySelector.parentNode.childNodes.find(c => c.classNames.includes('tagdeprecated'));
 
        let deprecated = !!deprecatedQuery ? { isDeprecated: true, replacement: /Please use (\w*) instead/gmi.exec(deprecatedQuery.text).pop() } : { isDeprecated: false };
        let limits = !!limitsQuery ? limitsQuery.childNodes.map(n => {
            return { type: n.childNodes[0].text.substring(11), limits: n.childNodes[1].text.substring(1).trim().split('-').map(i => i.trim()) }
        }) : [];

        //console.log('Limits')
        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile('../tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.log(err)
                res.send(JSON.stringify({ message: 'An internal server error occurred' }))
            } else {
                res.send(JSON.stringify(matchedTag));
            }

        });


    }
});

client.connect('wss://blargbot.xyz');

module.exports = router;
