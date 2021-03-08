const router = require('express').Router();
const latex = require('node-latex');
const fs = require('fs');
const replacements = require('./tex.json');
const gm = require('gm');
const concat = require('concat-stream');
const { input } = require('node-pdftocairo');
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let concatStream = concat(resolve)
    stream.on('error', reject);
    stream.pipe(concatStream);
  })
}

router.get('/', async(req, res, next) => {
  let data = req.query;
  console.info(JSON.stringify(req.query));
  if (!data.content) {
    return res.status(200).send('No content')
  }
  let backgroundColor = data.backgroundColour || 'FFFFFF'
  let textColor = data.colour || '000000';
  let block = data.block ? data.block :  'gathered';
  let content = data.content;
  for(var key in replacements) {
    let regex = new RegExp(key, 'g');
    if(regex.test(content)) {
      content = content.replace(regex, replacements[key]);
    }
  }
  let template = fs.readFileSync(__dirname + '/template.tex', 'utf8');
  let document = template.replace(/#BACKGROUNDCOLOUR/g, backgroundColor)
    .replace(/#COLOUR/g, textColor)
    .replace(/#BLOCK/g, block)
    .replace(/#CONTENT/g, content);
  console.info(document);
  try {
    
    let latexPDF = latex(document);
    let latexPNG = await streamToBuffer(latexPDF);
    let gmBuffer = await new Promise((resolve, reject) => {
      gm(latexPNG).density(4096, 4096).quality(100).setFormat('png').resize(512).toBuffer((err, buffer) => {
        if(err) reject(err);
        resolve(buffer);
      })
    })
    // const options = { format: 'png', scale: 512 };
    // const outputBuffer = await input(latexPNG, options).output();
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': gmBuffer.length
    });
    res.end(gmBuffer);
  } catch(e) {
    console.error('Error rendering latex:\n' + e);
  }
});


module.exports = router;