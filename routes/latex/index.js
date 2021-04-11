const router = require("express").Router();
const latex = require("node-latex");
const fs = require("fs");
const replacements = require("./tex.json");
const gm = require("gm");
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
  if(fs.existsSync(__dirname+ '/cached/'+req.params.id+'.png')) {
    return res.sendFile(__dirname+'/cached/'+req.params.id+'.png');
  };
  return res.send(JSON.stringify({error: 'File doesn\'t exist.'}));
});

router.post("/", async (req, res, next) => {
  let data = req.body;
  console.info(JSON.stringify(req.query));
  if (!data.content) {
    return res.status(200).send("No content");
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
    let gmWrite = await new Promise((resolve, reject) => {
      gm(latexPNG)
        .density(4096, 4096)
        .quality(100)
        .setFormat('png')
        .resize(512)
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
  }
});

module.exports = router;
