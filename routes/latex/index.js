const router = require("express").Router();
const latex = require("node-latex");
const fs = require("fs");
const replacements = require("./tex.json");
const gm = require("gm");
const Inkscape = require('inkscape'),
  svgToPdf = new Inkscape(['--export-pdf','--export-width=1024']);
const concat = require("concat-stream");
const advancedTemplate = fs.readFileSync(__dirname + "/template.tex", "utf8");
const standardTemplate = fs.readFileSync(
  __dirname + "/basictemplate.tex",
  "utf8"
);
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let concatStream = concat(resolve);
    stream.on("error", reject);
    stream.pipe(concatStream);
  });
};

router.get('/:id', (req, res) => {
  console.info(req.params.id);
  console.info("REQUEST!");
  if(req.params.id.endsWith('.pdf')) {
    return res.sendFile(__dirname+'/cached/'+req.params.id);
  } else {
    if(req.params.id.endsWith('.png')) {
      req.params.id = req.params.id.replace('.png', '');
    };
  };
  if(fs.existsSync(__dirname+ '/cached/'+req.params.id+'.png')) {
    return res.sendFile(__dirname+'/cached/'+req.params.id+'.png');
  };
  return res.send(JSON.stringify({error: 'File doesn\'t exist.'}));
});

router.post("/", async (req, res, next) => {
  let data = req.body;
  console.info(JSON.stringify(req.query));
  if (!data.content) {
    return res.type('json').status(200).send(JSON.stringify({error:"No content"}));
  }
  let backgroundColor = data.backgroundColour || "000000";
  let textColor = data.colour || "FFFFFF";
  let block = data.block || "flushleft";
  let documentClass = data.documentClass || "standalone";
  let content = data.content;
  let template = data.advanced ? advancedTemplate : standardTemplate;
  for (var key in replacements) {
    let regex = new RegExp(key, "g");
    if (regex.test(content)) {
      content = content.replace(regex, replacements[key]);
    }
  }
  let document = template
    .replace(/#BACKGROUNDCOLOUR/g, backgroundColor)
    .replace(/#DOCUMENTCLASS/g, documentClass)
    .replace(/#COLOUR/g, textColor)
    .replace(/#BLOCK/g, block)
    .replace(/#CONTENT/g, content);
  console.info(document);
  try {
    let timestamp = Date.now();
    let latexPDF = latex(document);
    let latexPNG = await streamToBuffer(latexPDF);
    fs.writeFile(__dirname + '/cached/' + timestamp + '.pdf', latexPNG, (err) => {
      if(err) console.error(err);
    });
    let gmWrite1 = await new Promise((resolve, reject) => {
      gm(latexPNG)
        .density(4096, 4096)
        .quality(100)
        .setFormat('png')
        .resize(4096)
        .write(__dirname + "/cached/" + timestamp + ".png", (err) => {
          if (!err) return resolve();
          console.error(err);
        });
    });

    res.send(
      JSON.stringify({
        root: "https://api.nicelink.xyz/latex",
        path: "/" + timestamp,
        id: timestamp
      })
    );
  } catch (e) {
    console.error("Error rendering latex:\n" + e);
    res.send(JSON.stringify({error: 'Error rendering latex', message: e.toString()}));
  }
});

router.get('/simple', async(req, res) => {
  if(req.query && !req.query.functions) return res.send('No functions!');
  let functions;
  try {
    functions = JSON.parse(req.query.functions);
  } catch(e) {};
  if(!functions) return res.send('Functions is not an array');
  let objFunctions = [];
  functions.forEach(f => {
    if(f.split(';').length > 1) {
      objFunctions.push({
        x: f.split(';')[0].replace('x', 't').replace(/(deg()(t)())/g, 't'),
        y: f.split(';')[1].replace('x', 't').replace(/(deg()(t)())/g, 't'),
        fnType: 'parametric',
        graphType: 'polyline' 
      });
    } else {
      objFunctions.push({
        fn: f.replace(/(deg()(x)())/g, 'x')
      })
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
  
  
  functionPlot({
    target: "#root",
    width,
    height,
    yAxis: { domain: [-10, 10] },
    grid: true,
    data: #FUNCTIONS
  });
  
        </script>
  </body>
  
  </html>`;

  res.send(htmlTemplate.replace('#FUNCTIONS', JSON.stringify(objFunctions)))
});
module.exports = router;
