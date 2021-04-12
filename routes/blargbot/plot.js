const express = require('express');
const router = express.Router();

const colours = ["red", "purple", "orange", "yellow", "green", "lime", "cyan", "teal", "violet", "magenta", "pink", "white"];
const flags = {
    x: 'domain',
    y: 'range',
    l: 'legend',
    n: 'samples'
};

router.post('/', (req, res) => {
    if (!req.body || !req.body.input) {
        return res.type('json').send(JSON.stringify({
            error: 'Empty request!'
        }));
    };
    let globalObj = {
        _: []
    };
    let output = [];
    let splitInput = req.body.input.split('\n');
    splitInput.forEach((line, i, a) => {
        let currentFlag = '';
        let doGlobal = false;
        let lineObj = {
            _: []
        };
        line.split(' ').forEach((word, j, b) => {
            let pushValue = true;
            if (word.startsWith('--')) {
                if(word.length > 2) {
                    let flag = Object.keys(flags).filter(f => flags[f] === word.toLowerCase());
                    if(flag.length !== 0) {
                        if(doGlobal) {
                            globalObj[flag[0]] = [];
                        } else {
                            lineObj[flag[0]] = [];
                        };
                        pushValue = false;
                    };
                } else if(i === splitInput.length -1) {
                    doGlobal = true;
                    pushValue = false;
                };
            } else if (word.startsWith('-')) {
                if (word.length > 1) {
                    let tempFlag = word.substring(1);

                    for (let char of tempFlag) {
                        if (char in flags) {
                            currentFlag = char;
                            if(doGlobal) {
                                globalObj[currentFlag] = [];
                            } else {
                                lineObj[currentFlag] = [];
                            };
                        };
                    };
                    pushValue = false;
                }
            } else if (word.startsWith('\\-')) {
                word = word.substring(1);
            }

            if (pushValue) {
                if (currentFlag != '') {
                    if (doGlobal) {
                        globalObj[currentFlag].push(word);
                    } else {
                        lineObj[currentFlag].push(word);
                    };
                } else {
                    if (doGlobal) {
                        globalObj['_'].push(word);
                    } else {
                        lineObj['_'].push(word);
                    };
                };
            };
        });
        output.push(lineObj);
    });
    output.push(globalObj);
    return res.type('json').send(JSON.stringify(output, null, 2));
});

module.exports = router;