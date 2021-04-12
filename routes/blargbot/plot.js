const express = require('express');
const router = express.Router();

const colours = ["red", "purple", "orange", "yellow", "green", "lime", "cyan", "teal", "violet", "magenta", "pink", "white"];
const flags = {
    x: 'domain',
    y: 'range',
    L: 'legend',
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
                if (word.length > 2) {
                    let flag = Object.keys(flags).filter(f => flags[f] === word.toLowerCase());
                    if (flag.length !== 0) {
                        if (doGlobal) {
                            globalObj[flag[0]] = [];
                        } else {
                            lineObj[flag[0]] = [];
                        };
                        pushValue = false;
                    };
                } else if (i === splitInput.length - 1) {
                    doGlobal = true;
                    pushValue = false;
                };
            } else if (word.startsWith('-')) {
                if (word.length > 1) {
                    let tempFlag = word.substring(1);

                    for (let char of tempFlag) {
                        if (char in flags) {
                            currentFlag = char;
                            if (doGlobal) {
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
    let axisTemplate = `\\begin{tikzpicture}
    \\begin{axis}[
        x line = middle,
        axis y = middle,
        xlabel={$x$},
        ylabel={$y$},
        xmin=#XMIN,
        xmax=#XMAX,
        ymin=#YMIN,
        ymax=#YMAX,
        legend style={fill=black,draw=white}
    ]
    #FUNCTIONS
    \\end{axis}
    \\end{tikzpicture}`
    let functionTemplate = `\\addplot[nomarks,color=#COLOR,domain=#DOMAIN] expression[samples=#SAMPLES]{#FUNCTION}
        #LEGENDTRY`
    let legendEntryTemplate = `\\addlegentry{$#FUNCTION$}`;
    if (!globalObj.x) {
        if (output.length === 1 && output[0].x) {
            if (!output[0].x.split(':').length !== 2) {
                globalObj.xmin = '-10';
                globalObj.xmax = '10';
            } else {
                globalObj.xmin = output[0].x.split(':')[0];
                globalObj.xmax = output[0].x.split(':')[1];
            }
        } else {
            globalObj.xmin = '-10';
            globalObj.xmax = '10';
        };
    } else {
        if (!globalObj.x.split(':').length !== 2) {
            globalObj.xmin = '-10';
            globalObj.xmax = '10';
        } else {
            globalObj.xmin = globalObj.x.split(':')[0];
            globalObj.xmax = globalObj.x.split(':')[1];
        }
    };
    if (globalObj.y) {
        if (!globalObj.x.split(':').length !== 2) {
            globalObj.ymin = '-10';
            globalObj.ymax = '10';
        } else {
            globalObj.xmin = globalObj.x.split(':')[0];
            globalObj.xmax = globalObj.x.split(':')[1];
        }
    } else if (output.length === 1 && output[0].y) {
        if (!globalObj.x.split(':').length !== 2) {
            globalObj.ymin = '-10';
            globalObj.ymax = '10';
        } else {
            globalObj.xmin = globalObj.x.split(':')[0];
            globalObj.xmax = globalObj.x.split(':')[1];
        }
    };
    if(!globalObj.n) {
        globalObj.n = '1000';
    };
    let functions = [];
    output.forEach((func, i) => {
        let domain = func.x || globalObj.xmin + ':' + globalObj.xmax;
        functions.push(functionTemplate
                .replace('#COLOR', colours[i])
                .replace('#DOMAIN', domain)
                .replace('#SAMPLES', func.n || globalObj.n)
                .replace('#LEGENDTRY', globalObj.L ? '' : (func.L ? '' : legendEntryTemplate.replace('#FUNCTION', func._)))
                .replace('#FUNCTION', func._)
            );
    })
    let axis = axisTemplate
        .replace('#XMIN', globalObj.xmin)
        .replace('#XMAX', globalObj.xmax)
        .replace(globalObj.ymin && globalObj.ymax ? '#YMIN' : 'ymin=#YMIN,', globalObj.ymin && globalObj.ymax ? globalObj.ymin : '')
        .replace(globalObj.ymin && globalObj.ymax ? '#YMAX' : 'ymax=#YMAX,', globalObj.ymin && globalObj.ymax ? globalObj.ymax : '')
        .replace('#FUNCTIONS', functions.join('\n'));
    return res.send(axis);


});

module.exports = router;