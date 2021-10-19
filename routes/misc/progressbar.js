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
    const percentage = parseInt(req.query.p || req.query.percentage);
    if (isNaN(percentage))
        return res.send('Invalid percentage');
    if (percentage < 0 || percentage > 100)
        return res.send('Percentage out of range');

    const cachedImage = cachedBars[color + percentage]
    if (cachedImage) {
        res.set('Content-Type', Jimp.MIME_PNG);
        return res.send(cachedImage.buffer)
    }
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

    const image = pillShape.clone().resize(1000, Jimp.AUTO).opacity(0.5).composite(colouredImage, 4, 4);

    image.getBuffer(Jimp.MIME_PNG, function(err, buffer){
        res.set("Content-Type", Jimp.MIME_PNG);
        res.send(buffer);
        cachedBars[color + percentage] = {
            time: Date.now(),
            buffer
        };
    });
});

setInterval(() => {
    let deletedAmount = 0;
    for (const [key, value] of Object.entries(cachedBars)) {
        if (value.time + 86400 * 1000 < Date.now()) {
            delete cachedBars[key];
            deletedAmount++;
        }
      }
    if (deletedAmount > 0)
        console.info('Removed ' + deletedAmount + ' cached bars.');
}, 86400 * 1000)


module.exports = router;