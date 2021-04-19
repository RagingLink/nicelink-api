const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();
const Jimp = require("jimp");

var circleMask;
Jimp.read(__dirname + "/circle-mask.png")
  .then((image) => {
    circleMask = image;
    console.info("Read circle-mask!");
  })
  .catch((err) => {
    console.error("Error reading circle-mask.png: " + err);
  });

var transparentBG;
Jimp.read(__dirname + "/transparent.png")
  .then((image) => {
    transparentBG = image;
    console.info("Read transparentbg!");
  })
  .catch((err) => {
    console.error("Error reading transparent.png: " + err);
  });

async function processJimp(
  body = {},
  errorObject = { errors: [], warnings: [], childrenObjects: [] }
) {
  errorObject = Object.assign(
    { src: body.background || "transparent.png" },
    errorObject
  );
  return new Promise(async (resolve, reject) => {
    let background;
    if (!body.background) {
      background = transparentBG.clone();
    } else {
      try {
        background = await Jimp.read({
          url: body.background,
          headers: {},
        });
        delete body.background;
      } catch (e) {
        console.error(e);
        errorObject.errors.push("Invalid background image");
        return reject(errorObject);
      }
    }
    //? Resize background if width or height is specified
    if (
      !isNaN(parseInt(body.width || body.w)) ||
      !isNaN(parseInt(body.height || body.h))
    ) {
      let width = !isNaN(parseInt(body.w || body.width))
        ? parseInt(body.w || body.width)
        : Jimp.AUTO;
      let height = !isNaN(parseInt(body.h || body.height))
        ? parseInt(body.h || body.height)
        : Jimp.AUTO;
      background.resize(width, height);
    }
    // ? Place images before changing other properties on the parent
    if (body.images) {
      try {
        body.images = JSON.parse(body.images);
      } catch (e) {}
      if (!body.images) {
        errorObject.errors.push("Invalid property 'images'");
      } else if (!Array.isArray(body.images)) {
        errorObject.errors.push("Property 'images' is not an array");
      } else {
        for (var j = 0; j < body.images.length; j++) {
          let processedImage = await processJimp(body.images[j]);
          let image = processedImage[0];
          errorObject.childrenObjects.push(processedImage[1]);
          background.composite(
            image,
            !isNaN(parseInt(body.images[j].x)) ? parseInt(body.images[j].x) : 0,
            !isNaN(parseInt(body.images[j].y)) ? parseInt(body.images[j].y) : 0
          );
        }
      }
    }

    if (body.opacity) {
      body.opacity = parseInt(body.opacity);
      if (isNaN(body.opacity)) {
        errorObject.errors.push("Property 'opacity' is not a number");
      } else {
        background.opacity(body.opacity / 100);
      }
    }

    if (body.rotate) {
      body.rotate = parseInt(body.rotate);
      if (isNaN(body.opacity)) {
        errorObject.errors.push("Property 'rotate' is not a number");
      } else {
        background.rotate(body.rotate);
      }
    }
    if (body.shape) {
      switch (body.shape.toLowerCase()) {
        case "circle": {
          background.mask(circleMask, 0, 0);
          break;
        }
      }
    }
    return resolve([background, errorObject]);
  });
}

async function processChild(body) {}

router.get("/", async (req, res) => {
  try {
    let image = await processJimp(req.query);
    image[0].write(__dirname + "/cached/test.png", () =>
      res.sendFile(__dirname + "/cached/test.png")
    );
    console.info(JSON.stringify(image[1], null, 2));
  } catch (e) {
    console.info(e);
    res.type('json').send(JSON.stringify(e));
  }
});
module.exports = router;
