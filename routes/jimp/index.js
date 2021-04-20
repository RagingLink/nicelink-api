const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();
const Jimp = require("jimp");
const { parse } = require("mathjs");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const txt2png = require('text2png');
const defaultTextOptions = {
  color: "black",
  font: "30px arial", //TODO Customization
  textAlign: "left",
  color: "black",
  backgroundColor: "transparent",
  lineSpacing: 0,
  strokeWidth: 0,
  strokeColor: "white",
  padding: 0,
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  borderWidth: 0,
  border: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  borderTopWidth: 0,
  borderBottomWidth: 0,
  borderColor: "black",
  localFontPath: undefined, //! Unused
  localFontName: undefined, //! Unused
  output: "buffer", //! Unused
};
// ? Initializing circle-mask for making the 'circle' shape
var circleMask;
Jimp.read(__dirname + "/circle-mask.png")
    .then((image) => {
        circleMask = image;
        console.info("Read circle-mask!");
    })
    .catch((err) => {
        console.error("Error reading circle-mask.png: " + err);
    });

// ? Initializing the default background if 'background' is not provided
var transparentBG;
Jimp.read(__dirname + "/transparent.png")
    .then((image) => {
        transparentBG = image;
        console.info("Read transparentbg!");
    })
    .catch((err) => {
        console.error("Error reading transparent.png: " + err);
    });
// ? Load 128px Open Sans black font
var SANS_128_FONT;
Jimp.loadFont(Jimp.FONT_SANS_128_BLACK).then(font => {
    SANS_128_FONT = font;
});

// ? Process GET or POST request and return [Jimp image, Error object]
async function processJimp(
    body = {},
    errorObject = {
        errors: [],
        warnings: [],
        childrenObjects: []
    }
) {
    errorObject = Object.assign({
            src: body.background || "transparent.png"
        },
        errorObject
    );
    return new Promise(async (resolve, reject) => {
        let background;
        if (!body.background && !body.bg) {
            background = transparentBG.clone();
        } else {
            try {
                background = await Jimp.read({
                    url: body.background || body.bg,
                    headers: {},
                });
                delete body.background && delete body.bg;
            } catch (e) {
                console.error(e);
                errorObject.errors.push('Invalid background image');
                return reject(errorObject);
            }
        }
        //? Resize background if width or height is specified
        if (
            !isNaN(parseInt(body.width || body.w)) ||
            !isNaN(parseInt(body.height || body.h))
        ) {
            let width = !isNaN(parseInt(body.width || body.w)) ?
                parseInt(body.width || body.w) :
                Jimp.AUTO;
            let height = !isNaN(parseInt(body.height || body.h)) ?
                parseInt(body.height || body.h) :
                Jimp.AUTO;
            background.resize(width, height);
        }
        // ? Place images before changing other properties on the parent
        if (body.images || body.children) {
            try {
                body.images = JSON.parse(body.images);
            } catch (e) {
                try {
                    body.images = JSON.parse(body.children)
                } catch(e) {};
            };
            if (!body.images) {
                errorObject.errors.push("Invalid property 'images'");
            } else if (!Array.isArray(body.images)) {
                errorObject.errors.push("Property 'images' is not an array");
            } else {
                for (var j = 0; j < body.images.length; j++) {
                    let imageObj = body.images[j];
                    try {
                        let processedImage = await processJimp(imageObj);
                        let image = processedImage[0];
                        errorObject.childrenObjects.push(processedImage[1]);
                        if(imageObj.size) {
                            switch(imageObj.size.toLowerCase()) {
                                case 'contain' : {
                                    if(image.bitmap.width > background.bitmap.width || image.bitmap.height > background.bitmap.height) {
                                        image.scaleToFit(background.bitmap.width, background.bitmap.height);
                                    }
                                    break;
                                };
                            };
                        };
                        if (imageObj.alignment || image.align) {
                            switch((imageObj.alignment || imageObj.align).toLowerCase()) {
                                case 'center': {
                                    let baseX = Math.round((background.bitmap.width - image.bitmap.width) / 2);
                                    let baseY = Math.round((background.bitmap.height - image.bitmap.height) / 2);
                                    let x = !isNaN(parseInt(imageObj.x)) ? baseX + parseInt(imageObj.x) : baseX;
                                    let y = !isNaN(parseInt(imageObj.y)) ? baseY + parseInt(imageObj.y) : baseY;
                                    background.composite(image, x, y);
                                    break;
                                };
                            }
                        } else {
                            background.composite(
                                image,
                                !isNaN(parseInt(imageObj.x)) ?
                                parseInt(imageObj.x) :
                                0,
                                !isNaN(parseInt(imageObj.y)) ?
                                parseInt(imageObj.y) :
                                0
                            );
                        }
                    } catch (e) {
                        errorObject.childrenObjects.push(e);
                        return reject(errorObject);
                    };
                };
            };
        };

        //? Oh boy
        if(body.text || body.txt) {
            try { 
                body.text = JSON.parse(body.text || body.txt)
            } catch(e) {};
            if(body.text && !Array.isArray(body.text)) {
                if(typeof body.text === 'object') {
                    let imageObj = Object.assign(defaultTextOptions, body.text);
                    if(!imageObj.text && !imageObj.txt) {
                        errorObject.errors.push('Empty \'text\' property');
                    };

                    let textBuffer = txt2png(imageObj.text || imageObj.txt, imageObj);
                    let textImage = await new Promise((res, rej) => {
                        Jimp.read(textBuffer).then(res).catch(rej);
                    });
                    if(imageObj.align) {
                        switch(imageObj.align.toLowerCase()) {
                            case 'center': {
                                let baseX = Math.round((background.bitmap.width - textImage.bitmap.width) / 2);
                                let baseY = Math.round((background.bitmap.height - textImage.bitmap.height) / 2);
                                let x = !isNaN(parseInt(imageObj.x)) ? baseX + parseInt(imageObj.x) : baseX;
                                let y = !isNaN(parseInt(imageObj.y)) ? baseY + parseInt(imageObj.y) : baseY;
                                background.composite(textImage, x, y);
                                break;
                            };
                        }
                    }
                } else {
                    errorObject.errors.push('Property \'text\' is not a valid array or object');
                }
            } else if(body.text) {
                // TODO maxWidth, height, x, y
                for(var j = 0; j < body.text.length; j++) {
                    let imageObj = Object.assign(defaultTextOptions, body.text[j]);
                    if(!imageObj.text && !imageObj.txt) {
                        errorObject.errors.push('Empty \'text\' property at index: ' + j);
                        continue;
                    };

                    let textBuffer = txt2png(imageObj.text || imageObj.txt, imageObj);
                    let textImage = await new Promise((res, rej) => {
                        Jimp.read(textBuffer).then(res).catch(rej);
                    });
                    if(imageObj.align) {
                        switch(imageObj.align.toLowerCase()) {
                            case 'center': {
                                let baseX = Math.round((background.bitmap.width - textImage.bitmap.width) / 2);
                                let baseY = Math.round((background.bitmap.height - textImage.bitmap.height) / 2);
                                let x = !isNaN(parseInt(imageObj.x)) ? baseX + parseInt(imageObj.x) : baseX;
                                let y = !isNaN(parseInt(imageObj.y)) ? baseY + parseInt(imageObj.y) : baseY;
                                background.composite(textImage, x, y);
                                break;
                            };
                        }
                    }
                }
            }
        }
        if (body.opacity || body.o) {
            body.opacity = parseInt(body.opacity || body.o);
            if (isNaN(body.opacity)) {
                errorObject.errors.push("Property 'opacity' is not a number");
            } else {
                background.opacity(body.opacity / 100);
            };
        };

        if (body.rotate || body.r) {
            body.rotate = parseInt(body.rotate || body.r);
            if (isNaN(body.rotate)) {
                errorObject.errors.push("Property 'rotate' is not a number");
            } else {
                background.rotate(-body.rotate);
            };
        };
        if (body.shape || body.s) {
            switch ((body.shape || body.s).toLowerCase()) {
                case "circle": {
                    let smallest = background.bitmap.width < background.bitmap.height ? background.bitmap.width : background.bitmap.height;
                    let x = Math.round((background.bitmap.width - smallest) / 2);
                    let y = Math.round((smallest - background.bitmap.height) / 2);
                    background.crop(x, y, smallest, smallest);
                    background.background(0x000000);
                    background.mask(circleMask.clone().resize(smallest, smallest), 0, 0);
                    break;
                }
            };
        };
        return resolve([background, errorObject]);
    });
};

// ? For returning stored images
router.get('/:image', async(req, res) => {
    if(fs.existsSync(__dirname + '/cached/' + req.params.image)) {
        res.sendFile(__dirname + '/cached/' + req.params.image);
    } else {
        res.send(req.params.image + ' doesn\'t exist.');
    };
})

// ? For getting the image
router.get('/', async (req, res) => {
    try {
        let image = await processJimp(req.query);
        image[0].write(__dirname + '/cached/test.png', () =>
            res.sendFile(__dirname + '/cached/test.png')
        );
    } catch (e) {
        console.error(e);
        res.send('Error rendering content');
    };
});

// ? For getting the image path and errors/warnings
router.post('/', async(req, res) => {
    let processedJimp = [];
    try {
        processedJimp = await processJimp(req.body);
    } catch (e) {
        processedJimp[1] = e;
    };
    let imagePath = Object.keys(req.body).reduce((acc, item) => {
        return acc + `${item}=${req.body[item]}&`
    }, '?');
    processedJimp[1] = Object.assign({
        root : 'https://api.nicelink.xyz/jimp',
        path : imagePath
    }, processedJimp[1]);
    res.type('json').send(JSON.stringify(processedJimp[1], null, 2))
});


router.post('/store', async(req, res) => {
    let processedJimp = [null, {}];
    let uniqueID = uuidv4();
    try {
        processedJimp = await processJimp(req.body);
        processedJimp[0].write(__dirname + '/cached/' + uniqueID + '.png');
    } catch (e) {
        processedJimp[1] = e;
        processedJimp[1].error = true;
    };
    // ! let imagePath = Object.keys(req.body).reduce((acc, item) => {
    // !    return acc + `${item}=${req.body[item]}&`
    // ! }, '?');
    processedJimp[1] = Object.assign({
        root : 'https://api.nicelink.xyz/jimp',
        path : processedJimp[1].error ? null : '/' + uniqueID + '.png'
    }, processedJimp[1]);
    res.type('json').send(JSON.stringify(processedJimp[1], null, 2))
});

// ? Transparent image
router.get('/transparent.png', (req, res) => {
    res.sendFile(__dirname + '/transparent.png');
});

module.exports = router;