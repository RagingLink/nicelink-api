const express = require('express');
const router = express.Router();
var WebSocket = require('ws');
var rWebSocket = require('reconnecting-websocket')
var moment = require('moment');
const CatLoggr = require('cat-loggr');

let shardData = { data: [], date: [] };
let bent = require("bent");
let { parse } = require("node-html-parser");
let subtagCache = {};
let tagJson = require(__dirname + '/tags.json');
const fs = require('fs');

router.get('/shards', (req, res, next) => {
    res.type('json')
    res.send(`${JSON.stringify(shardData.data, null, 2)}`);
    let updateDates = Object.values(shardData.date);
    let oldestUpdate = updateDates.slice(0).sort((a, b) => a > b ? 1 : -1);
    let newestUpdate = updateDates.slice(0).sort((a, b) => a < b ? 1 : -1);
    console.info(`Oldest cluster update was at ${moment.unix(oldestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
    console.info(`Newest update was at ${moment.unix(newestUpdate.shift()).format('HH:mm:ss DD/MM/YYYY')}`)
});
router.get('/test', (req, res, next) => {
    setTimeout(() => res.send("OK"), 61000);
})
//let wsInterval;
let wss = new rWebSocket('wss://blargbot.xyz', [], { WebSocket });
wss.addEventListener('open', (ws) => {
    console.info('Connected to wss://blargbot.xyz')
});

wss.addEventListener('message', (event) => {
    let data = JSON.parse(event.data);
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

        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile(__dirname + '/tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.error(err)
            } else {
                res.send(JSON.stringify({ updated: true, message: 'Updated ' + matchedTag.name + ' succesfully!' }))
            }

        });
    } else {
        let matchedTag = Object.values(tagJson).filter(e => e.name === name.toLowerCase()).shift();
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

        matchedTag.limits = limits;
        matchedTag.deprecated = deprecated;
        subtagCache[matchedTag.name] = matchedTag;
        tagJson[matchedTag.name] = matchedTag;

        fs.writeFile(__dirname + '/tags.json', JSON.stringify(tagJson), 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                res.status(500).send(JSON.stringify({ message: 'An internal server error occurred' }))
            } else {
                res.status(200).send(JSON.stringify(matchedTag));
            }
        });
    }
});



module.exports = router;
