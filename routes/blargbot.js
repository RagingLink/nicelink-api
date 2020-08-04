const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
var WebSocket = require('ws');
var rWebSocket = require('reconnecting-websocket')
var moment = require('moment');


let shardData = { data: [] };
let bent = require("bent");
let { parse } = require("node-html-parser");
let subtagCache = {};
let tagJson = require(__dirname + '/tags.json');
const { fstat } = require('fs');
const fs = require('fs');
let path = require('path');

router.get('/shards', (req, res, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
    shardData.data.forEach((e) => {
        console.log(`Updated ${e.id} at ${moment(shardData.date[e.id]).format('DD/MM/YYYY HH:mm:ss')}`)
    })
});
router.get('/test', (req, res, next) => {
    setTimeout(() => res.send("OK"), 61000);
})
let wsInterval;
let wss = new rWebSocket('wss://blargbot.xyz', [], { WebSocket });
wss.addEventListener('open', (ws) => {
    console.log('Connected to blargbot.xyz')

    if (wsInterval)
        clearInterval(wsInterval);
    wsInterval = setInterval(() => wss.send(JSON.stringify({ type: 'requestShards' })), 5000);

});

wss.addEventListener('message', (event) => {
    if (event.type !== 'utf8')
        return
    let data = JSON.parse(event.data);
    console.log(Object.keys(data));
    if (data.code != 'shard')
        return;
    shardData.data[data.data.id] = data.data;
    shardData.date[data.data.id] = Math.floor(new Date() / 1000)
})



router.get("/tags", async (req, res, next) => {
    res.type('json')
    let name = req.query.tag;
    let update = req.query.update;

    if (!name) {
        res.send(JSON.stringify(Object.values(tagJson), null, 2))
        return;
    }

    if (update) {
        let getJson = bent('json');
        let newTagJson = await getJson('https://blargbot.xyz/tags/json');
        let getTags = bent('GET');
        let text = await parse(await (await getTags("https://blargbot.xyz/tags")).text());
        let matchedTag = newTagJson.filter(e => e.name === name.toLowerCase()).shift();
        if (name === 'chaos') {
            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
            }
            let arr = Object.keys(tagJson);
            shuffleArray(arr);
            res.send(JSON.stringify(arr.map(i => tagJson[i]), null, 2))
            return
        };

        if (!matchedTag) {
            res.send(JSON.stringify({ error: "Subtag doesn't exist", message: "This subtag doesn't exist, please provide a valid name. If you believe this is a bug please try providing the `update=true` parameter to the url" }));
            return;
        }
        if (name === 'abs') {
            let sortedJson = {};
            Object.keys(tagJson).sort().map(k => sortedJson[k] = tagJson[k]);
            tagJson = sortedJson
        }
        let querySelector = await text.querySelector('#' + matchedTag.name);
        let limitsQuery = await querySelector.parentNode.childNodes.find(c => c.text.startsWith('Limits'));
        let deprecatedQuery = await querySelector.parentNode.childNodes.find(c => c.classNames.includes('tagdeprecated'));

        let deprecated = !!deprecatedQuery ? { isDeprecated: true, replacement: !!/Please use (\w*) instead/gmi.exec(deprecatedQuery.text) ? /Please use (\w*) instead/gmi.exec(deprecatedQuery.text).pop() : null } : { isDeprecated: false };
        let limits = !!limitsQuery ? limitsQuery.childNodes.map(n => {
            return { type: n.childNodes[0].text.substring(11), limits: n.childNodes[1].text.substring(1).trim().split('-').map(i => i.trim()) }
        }) : [];

        //console.log('Limits')
        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile(__dirname + '/tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.log(err)
            } else {
                res.send(JSON.stringify({ updated: true, message: 'Updated ' + matchedTag.name + ' succesfully!' }))
            }

        });
    } else {
        let matchedTag = Object.values(tagJson).filter(e => e.name === name.toLowerCase()).shift();
        //console.log('init match')
        if (!matchedTag) {
            res.send(JSON.stringify({ error: "Subtag doesn't exist", message: "This subtag doesn't exist, please provide a valid name. If you believe this is a bug please try providing the `update=true` parameter to the url" }));
            return;
        }

        if (subtagCache[name]) {
            res.status(200).send(JSON.stringify(subtagCache[name], null, 2));
            return;
        };
        if (tagJson[name]) {
            res.status(200).send(JSON.stringify(tagJson[name], null, 2));
            return;
        }

        let querySelector = await text.querySelector('#' + matchedTag.name);
        let limitsQuery = await querySelector.parentNode.childNodes.find(c => c.text.startsWith('Limits'));
        let deprecatedQuery = await querySelector.parentNode.childNodes.find(c => c.classNames.includes('tagdeprecated'));

        let deprecated = !!deprecatedQuery ? { isDeprecated: true, replacement: !!/Please use (\w*) instead/gmi.exec(deprecatedQuery.text) ? /Please use (\w*) instead/gmi.exec(deprecatedQuery.text).pop() : null } : { isDeprecated: false };
        let limits = !!limitsQuery ? limitsQuery.childNodes.map(n => {
            return { type: n.childNodes[0].text.substring(11), limits: n.childNodes[1].text.substring(1).trim().split('-').map(i => i.trim()) }
        }) : [];

        //console.log('Limits')
        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile(__dirname + '/tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.log(err)
                res.status(500).send(JSON.stringify({ message: 'An internal server error occurred' }))
            } else {
                res.status(200).send(JSON.stringify(matchedTag));
            }

        });


    }
});



module.exports = router;
