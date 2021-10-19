const router = require('express').Router();
const replaceColor = require('../jimp/replace-color');
const Jimp = require('jimp');
const path = require('path');
const cachedBars = {};

let pillShape;
Jimp.read(path.join(__dirname, '..', '..', 'images', 'pillshape.png')).then(pill => {
    pillShape = pill;
    console.info('Read pillShape');
});

router.get('/', async (req, res) => {
    const color = req.query.c || req.query.color || req.query.colour || 'FFFFFF';
    console.info(req.query);
    const percentage = parseInt(req.query.p || req.query.percentage);
    if (isNaN(percentage))
        return res.send('Invalid percentage');
    if (percentage < 0 || percentage > 100)
        return res.send('Percentage out of range');

    const colouredImage = await replaceColor({
        image: pillShape.clone().resize(992, Jimp.AUTO),
			colors: {
				type: 'hex',
				targetColor: '#000000',
				replaceColor: '#' + color
			},
			deltaE: 2.3
        });
    colouredImage.crop(0, 0, colouredImage.bitmap.width / 100 * percentage, colouredImage.bitmap.height);

    pillShape.clone().resize(1000, Jimp.AUTO).opacity(0.5).composite(colouredImage, 4, 4).getBuffer(Jimp.MIME_PNG, function(err, buffer){
        res.set("Content-Type", Jimp.MIME_PNG);
        res.send(buffer);
    });
});

module.exports = router;