const bodyParser = require('body-parser');
const express = require('express');
const router = express.Router();
const Jimp = require('jimp');

var circleMask;
Jimp.read(__dirname+'/circle-mask.png').then(image => {
    circleMask = image;
    console.info('Read circle-mask!')
}).catch(err => {
    console.error('Error reading circle-mask.png: ' + err);
});

var transparentBG;
Jimp.read(__dirname +'/transparent.png').then( image => {
    transparentBG = image;
    console.info('Read transparentbg!')
}).catch(err => {
    console.error('Error reading transparent.png: ' + err);
});

async function processJimp(body = {}) {
    return new Promise(async (resolve, reject) => {
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
        if((body.width || body.w) || (body.height || body.h)) {
            background.resize(body.width || body.w || Jimp.AUTO, body.height || body.h || Jimp.AUTO);
        }
        //Resize background accordingly
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

router.get('/', async (req, res) => {
    let image = await processJimp(req.query);
    image.write(__dirname+'/cached/test.png', () => res.sendFile(__dirname + '/cached/test.png'));
})
module.exports = router;