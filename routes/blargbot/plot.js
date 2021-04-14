const express = require("express");
const router = express.Router();
const bent = require("bent");
const postPlot = bent("https://api.nicelink.xyz/", "POST", "json");
const Nightmare = require('nightmare')
const nightmare = Nightmare();
const fs = require('fs');
const Puppeteer = require('puppeteer');
let puppet, page;
(async () => {
    puppet = await Puppeteer.launch();

})
var uniqueID = 0;
const colours = [
    "red",
    "purple",
    "orange",
    "yellow",
    "green",
    "lime",
    "cyan",
    "teal",
    "violet",
    "magenta",
    "pink",
    "white",
];
const flags = {
    x: "domain",
    y: "range",
    L: "legend",
    n: "samples",
};
router.post("/functions", (req, res) => {
    if (!req.body || !req.body.input) {
        return res.type("json").send(
            JSON.stringify({
                error: "Empty request!",
            })
        );
    }
    let globalObj = {
        _: [],
    };
    let output = [];
    let splitInput = req.body.input.trim().split("\n");
    splitInput.forEach((line, i, a) => {
        let currentFlag = "";
        let doGlobal = false;
        let lineObj = {
            _: [],
        };
        line.split(" ").forEach((word, j, b) => {
            let pushValue = true;
            if (word.startsWith("--")) {
                if (word.length > 2) {
                    let flag = Object.keys(flags).filter(
                        (f) => flags[f] === word.toLowerCase()
                    );
                    if (flag.length !== 0) {
                        if (doGlobal) {
                            globalObj[flag[0]] = [];
                        } else {
                            lineObj[flag[0]] = [];
                        }
                        pushValue = false;
                    }
                } else if (i === splitInput.length - 1) {
                    doGlobal = true;
                    pushValue = false;
                }
            } else if (word.startsWith("-")) {
                if (word.length > 1) {
                    let tempFlag = word.substring(1);

                    for (let char of tempFlag) {
                        if (char in flags) {
                            currentFlag = char;
                            if (doGlobal) {
                                globalObj[currentFlag] = [];
                            } else {
                                lineObj[currentFlag] = [];
                            }
                            pushValue = false;
                        }
                    }
                }
            } else if (word.startsWith("\\-")) {
                word = word.substring(1);
            }

            if (pushValue) {
                if (currentFlag != "") {
                    if (doGlobal) {
                        globalObj[currentFlag].push(word);
                    } else {
                        lineObj[currentFlag].push(word);
                    }
                } else {
                    if (doGlobal) {
                        globalObj["_"].push(word);
                    } else {
                        lineObj["_"].push(word);
                    }
                }
            }
        });
        output.push(lineObj);
    });

    res.type('json').send(JSON.stringify(output.map(i => i._.join(' ').trim())));
});
router.post("/", async (req, res) => {
    if (!req.body || !req.body.input) {
        return res.type("json").send(
            JSON.stringify({
                error: "Empty request!",
            })
        );
    }
    let globalObj = {
        _: [],
    };
    let output = [];
    let splitInput = req.body.input.trim().split("\n");
    splitInput.forEach((line, i, a) => {
        let currentFlag = "";
        let doGlobal = false;
        let lineObj = {
            _: [],
        };
        line.split(" ").forEach((word, j, b) => {
            let pushValue = true;
            if (word.startsWith("--")) {
                if (word.length > 2) {
                    let flag = Object.keys(flags).filter(
                        (f) => flags[f] === word.toLowerCase()
                    );
                    if (flag.length !== 0) {
                        if (doGlobal) {
                            globalObj[flag[0]] = [];
                        } else {
                            lineObj[flag[0]] = [];
                        }
                        pushValue = false;
                    }
                } else if (i === splitInput.length - 1) {
                    doGlobal = true;
                    pushValue = false;
                }
            } else if (word.startsWith("-")) {
                if (word.length > 1) {
                    let tempFlag = word.substring(1);

                    for (let char of tempFlag) {
                        if (char in flags) {
                            currentFlag = char;
                            if (doGlobal) {
                                globalObj[currentFlag] = [];
                            } else {
                                lineObj[currentFlag] = [];
                            }
                            pushValue = false;
                        }
                    }
                }
            } else if (word.startsWith("\\-")) {
                word = word.substring(1);
            }

            if (pushValue) {
                if (currentFlag != "") {
                    if (doGlobal) {
                        globalObj[currentFlag].push(word);
                    } else {
                        lineObj[currentFlag].push(word);
                    }
                } else {
                    if (doGlobal) {
                        globalObj["_"].push(word);
                    } else {
                        lineObj["_"].push(word);
                    }
                }
            }
        });
        output.push(lineObj);
    });
    let axisTemplate = `\\begin{tikzpicture}
    \\begin{axis}[
        axis x line = middle,
        axis y line = middle,
        xlabel={$x$},
        ylabel={$y$},
        axis equal image,
        xmin=#XMIN,
        xmax=#XMAX,
        legend style={fill=black,draw=white}#RANGE
    ]
    #FUNCTIONS
    \\end{axis}
    \\end{tikzpicture}`;
    let functionTemplate = `\\addplot[no marks,color=#COLOR,domain=#DOMAIN] expression[samples=#SAMPLES]{#FUNCTION};
        #LEGENDTRY`;
    let parametricTemplate = `\\addplot[no marks,color=#COLOR,domain=#DOMAIN,samples=#SAMPLES]({#FUNCTION1},{#FUNCTION2});`;
    let legendEntryTemplate = `\\addlegendentry{$#FUNCTION$}`;
    if (!globalObj.x) {
        if (output.length === 1 && output[0].x) {
            if (output[0].x.join(" ").split(":").length !== 2) {
                globalObj.xmin = "-10";
                globalObj.xmax = "10";
            } else {
                globalObj.xmin = output[0].x.join(" ").split(":")[0];
                globalObj.xmax = output[0].x.join(" ").split(":")[1];
            }
        } else {
            globalObj.xmin = "-10";
            globalObj.xmax = "10";
        }
    } else {
        if (globalObj.x.join(" ").split(":").length !== 2) {
            globalObj.xmin = "-10";
            globalObj.xmax = "10";
        } else {
            globalObj.xmin = globalObj.x.join(" ").split(":")[0];
            globalObj.xmax = globalObj.x.join(" ").split(":")[1];
        }
    }
    if (globalObj.y) {
        if (globalObj.y.join(" ").split(":").length !== 2) {
            globalObj.ymin = "-10";
            globalObj.ymax = "10";
        } else {
            globalObj.ymin = globalObj.y.join(" ").split(":")[0];
            globalObj.ymax = globalObj.y.join(" ").split(":")[1];
        }
    } else if (output.length === 1 && output[0].y) {
        if (output[0].y.join(" ").split(":").length !== 2) {
            globalObj.ymin = "-10";
            globalObj.ymax = "10";
        } else {
            globalObj.ymin = output[0].y.join(" ").split(":")[0];
            globalObj.ymax = output[0].y.join(" ").split(":")[1];
        }
    } else {
        globalObj.ymin = "-10";
        globalObj.ymax = "10";
    }
    if (!globalObj.n) {
        globalObj.n = ["1000"];
    }
    console.info(JSON.stringify(output, null, 2));
    console.info(JSON.stringify(globalObj, null, 2));
    let functions = [];
    output.forEach((func, i) => {
        let domain = func.x ?
            func.x.join(" ") :
            globalObj.xmin + ":" + globalObj.xmax;
        if (func._.join(" ").split(";").length > 1) {
            functions.push(
                parametricTemplate
                .replace("#COLOR", colours[i])
                .replace("#DOMAIN", domain)
                .replace(
                    "#SAMPLES",
                    func.n ? func.n.join(" ") : globalObj.n.join(" ")
                )
                //.replace('#LEGENDTRY', globalObj.L ? '' : (func.L ? '' : legendEntryTemplate.replace('#FUNCTION', func._.join(' '))))
                .replace("#FUNCTION1", func._.join(" ").split(";")[0])
                .replace("#FUNCTION2", func._.join(" ").split(";")[1])
            );
        } else {
            functions.push(
                functionTemplate
                .replace("#COLOR", colours[i])
                .replace("#DOMAIN", domain)
                .replace(
                    "#SAMPLES",
                    func.n ? func.n.join(" ") : globalObj.n.join(" ")
                )
                .replace(
                    "#LEGENDTRY",
                    globalObj.L ?
                    "" :
                    func.L ?
                    "" :
                    legendEntryTemplate.replace("#FUNCTION", func._.join(" "))
                )
                .replace("#FUNCTION", func._.join(" "))
            );
        }
    });
    let axis = axisTemplate
        .replace("#XMIN", globalObj.xmin)
        .replace("#XMAX", globalObj.xmax)
        .replace(
            "#RANGE",
            globalObj.ymin && globalObj.ymax ?
            ",\n" + "ymin=" + globalObj.ymin + ",\n" + "ymax=" + globalObj.ymax :
            ""
        )
        .replace("#FUNCTIONS", functions.join("\n"));

    return res.type("json").send(
        JSON.stringify(
            await postPlot("latex", {
                content: axis,
            })
        )
    );
});

router.get('/fast', async function (req, res) {
    if (!req.query || !req.query.functions) {
        return res.send('No functions provided.');
    };
    let filename = `${Date.now()}-${uniqueID++}.png`;
    let functions;
    try {
        functions = JSON.parse(req.query.functions);
    } catch (e) {};
    if (!functions) {
        return res.send('Invalid function array');
    };
    page = await puppet.newPage();
    await page.setViewport({width: 1024, height: 1024 })
    await page.goto('https://api.nicelink.xyz/blargbot/plot/simple?functions=' + encodeURI(JSON.stringify(functions)))
    await page.waitForSelector('svg.function-plot');
    await page.screenshot({path:__dirname + '/cached/' + filename});
    res.sendFile(__dirname + '/cached/' + filename);
    // ! ADD auto removal after X days...
    /*fs.unlink(filename, (err) => {

        if (err) {
          console.error(err)
          return
        }*/
})
router.get("/simple", async (req, res) => {
    if (req.query && !req.query.functions) return res.send("No functions!");
    let functions;
    try {
        functions = JSON.parse(req.query.functions);
    } catch (e) {}
    if (!functions) return res.send("Functions is not an array");
    let objFunctions = [];
    functions.forEach((f) => {
        if (f.split(";").length > 1) {
            objFunctions.push({
                x: f
                    .split(";")[0]
                    .replace("x", "t")
                    .replace(/(deg()(t)())/g, "t")
                    .trim(),
                y: f
                    .split(";")[1]
                    .replace("x", "t")
                    .replace(/(deg()(t)())/g, "t")
                    .trim(),
                fnType: "parametric",
                graphType: "polyline",
            });
        } else {
            objFunctions.push({
                fn: f.replace(/(deg\()(.*)(\))/, '$2'),
            });
        }
    });

    let htmlTemplate = `<!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <meta name="theme-color" content="#000000">

      <title>Plot!</title>
      <script src="https://unpkg.com/function-plot/dist/function-plot.js"></script>
      <style>
        body,html {
       margin: 0;
       overflow: hidden;
       color: white;
       height: 100%;
       width: 100%
    }
     text {
       color: white;
    }
     .function-plot {
       background-color: black;
    }
     .function-plot .x.axis .tick line {
       color: white;
       stroke: white;
    }
     .function-plot .x.axis .tick text {
       color: white;
    }
     .function-plot .x.axis path.domain {
       color: white;
    }
     .function-plot .y.axis .tick line {
       color: white;
       stroke: white;
    }
     .function-plot .y.axis .tick text {
       color: white;
    }
     .function-plot .y.axis path.domain {
       color: white;
    }
      path.origin {
        stroke: white;
      }

      </style>
    </head>

    <body>
      <noscript>
        You need to enable JavaScript to run this app.
      </noscript>
      <div id="root"></div>
        <script>
          let contentsBounds = document.body.getBoundingClientRect();
          var width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;

    var height = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;
    let ratio = contentsBounds.width / width;

    function computeYScale (width, height, xScale) {
        var xDiff = xScale[1] - xScale[0]
        var yDiff = height * xDiff / width
        return [-yDiff / 2, yDiff / 2]
      }
    functionPlot({
      target: "#root",
      grid: true,
      height: height,
      width: width,
      xDomain : [-10, 10],
      yDomain : computeYScale(width, height, [-10,10]),
      data: #FUNCTIONS
    });

          </script>
    </body>

    </html>`;

    res.send(htmlTemplate.replace("#FUNCTIONS", JSON.stringify(objFunctions)));
});

module.exports = router;