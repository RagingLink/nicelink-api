const bodyParser = require('body-parser');
const express = require('express');
const router = express.Router();
const Jimp = require('jimp');

const circleMask = (async () => await Jimp.read('./circle-mask.png'))();
const transparentBG = (async () => await Jimp.read('./transparent.png'))();

async function processJimp(body = {}) {
    return new Promise((resolve, reject) => {
        let background;
        if(!body.background) {
            background = transparentBG.clone();
        } else {
            try {
                background = await Jimp.read({
                    url: body.background,
                    headers : {}
                });
                delete body.background;
            } catch(e) {
                reject(e);
            };
        };
        //Resize background accordingly
        background.resize(body.width || Jimp.AUTO, body.height || Jimp.AUTO);
        let bodyProperties = Object.keys(body);
        for(var i = 0; i < bodyProperties.length; i++) {
            let property = bodyProperties[i];
            let value = body[bodyProperties[i]];
            try{
                value = JSON.parse(value);
            } catch(e) {};
            switch(property.toLowerCase()) {
                case 'images': {
                    for(var j = 0; j < value.length; j++) {
                        let image = await processJimp(value[j]);
                        background.mask(image, image.x || 0, image.y || 0)
                    }
                }
            }
        }
        return resolve(background);
    })
}

async function processChild(body) {

}

router.get('/', (req, res) => {
    let image = await processJimp(req.query);
    image.write(__dirname+'/cached/test.png', () => res.sendFile(__dirname + '/cached/test.png'));
})
module.exports = router;