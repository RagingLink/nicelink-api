const router = require('express').Router();
const latex = require('node-latex');
const fs = require('fs');
const replacements = require('./tex.json');
const gm = require('gm').subClass({imageMagick: true});

router.get('/', (req, res, next) => {
  let data = req.query;
  console.info(JSON.stringify(req.query));
  if (!data.content) {
    return res.status(200).send('No content')
  }
  let backgroundColor = data.backgroundColor || 'FFFFFF'
  let textColor = data.color || '000000';
  let paperType = data.paperType ? data.paperType : (data.wide ? 'a2paper' : 'a5paper');
  let block = data.block ? data.block : (data.center ? 'gather*' : 'flushleft');
  let content = data.content;
  for(var key in replacements) {
    let regex = new RegExp(key, 'g');
    if(regex.test(content)) {
      content = content.replace(regex, replacements[key]);
    }
  }
  let template = fs.readFileSync(__dirname + '/template.tex', 'utf8');
  let document = template.replace('#PAPERTYPE', paperType)
    .replace('#BACKGROUNDCOLOUR', backgroundColor)
    .replace('#COLOUR', textColor)
    .replace('#BLOCK', block)
    .replace('#CONTENT', content);
  try {
    let stream = gm(latex(document), 'latex.pdf').setFormat('png').stream()
    stream.on('open', () => res.setHeader('Content-Type', 'image/png'));
    stream.pipe(res);
  } catch(e) {
    console.error('Error rendering latex:\n' + e);
  }
  });


module.exports = router;