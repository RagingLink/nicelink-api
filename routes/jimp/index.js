const bodyParser = require('body-parser');
const express = require('express');
const router = express.Router();
const Jimp = require('jimp');
const { parse } = require('mathjs');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ? Custom package https://github.com/RagingLink/text2png.git
const txt2png = require('./text2png');
//? Custom package https://github.com/RagingLink/replace-color.git
const replaceColor = require('./replace-color');
const { type } = require('os');

//! CHANGE FONT AT YOUR OWN RISK
const defaultTextOptions = {
	// color: "black",
	font: '30px arial', //TODO Customization
	// textAlign: "left",
	// backgroundColor: "transparent",
	// lineSpacing: 0,
	// strokeWidth: 0,
	// strokeColor: "white",
	// padding: 0,
	// paddingLeft: 0,
	// paddingRight: 0,
	// paddingTop: 0,
	// paddingBottom: 0,
	// borderWidth: 0,
	// border: 0,
	// borderLeftWidth: 0,
	// borderRightWidth: 0,
	// borderTopWidth: 0,
	// borderBottomWidth: 0,
	// borderColor: "black",
	// localFontPath: undefined, //! NO
	// localFontName: undefined, //! NO
};

// ? Initialize the circle-mask and default background
var circleMask;
var transparentBG;
var blackImage;
async function initializeBackgrounds() {
	// ? Initializing circle-mask for making the 'circle' shape

	Jimp.read(__dirname + '/circle-mask.png')
		.then((image) => {
			circleMask = image;
			console.info('Read circle-mask!');
		})
		.catch((err) => {
			console.error('Error reading circle-mask.png: ' + err);
		});

	// ? Initializing the default background if 'background' is not provided
	Jimp.read(__dirname + '/transparent.png')
		.then((image) => {
			transparentBG = image;
			console.info('Read transparentbg!');
		})
		.catch((err) => {
			console.error('Error reading transparent.png: ' + err);
		});
	blackImage = await new Promise((resolve, reject) => {
		Jimp.read(__dirname + '/black.png')
			.then(resolve)
			.catch(reject);
	});
}
initializeBackgrounds();

// ? Load 128px Open Sans black font
var SANS_128_FONT;
Jimp.loadFont(Jimp.FONT_SANS_128_BLACK).then((font) => {
	SANS_128_FONT = font;
});

// ? Process GET or POST request and return [Jimp image, Error object]
async function processJimp(
	body = {},
	errorObject = {
		errors: [],
		warnings: [],
		childrenObjects: [],
	}
) {
	errorObject = Object.assign(
		{
			src: body.background || 'https://api.nicelink.xyz/jimp/transparent.png',
		},
		errorObject
	);
	// * All the big boy logic
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
		/**
		 * * Resize background if width and/or height is specified
		 * ? If one value is omitted, the ratio will be preserved
		 */
		if (
			!isNaN(parseInt(body.width || body.w)) ||
			!isNaN(parseInt(body.height || body.h))
		) {
			let width = !isNaN(parseInt(body.width || body.w))
				? parseInt(body.width || body.w)
				: Jimp.AUTO;
			let height = !isNaN(parseInt(body.height || body.h))
				? parseInt(body.height || body.h)
				: Jimp.AUTO;
			background.resize(width, height);
		}
		delete body.width && delete body.w && delete body.h && delete body.height;
		let properties = Object.keys(body);
		propertiesLoop: for (var i = 0; i < properties.length; i++) {
			let key = properties[i];
			let data = body[key] || '';
			switch (key.toLowerCase()) {
				case 'replacecolor': {
					try {
						data = JSON.parse(data);
					} catch (e) {}
					if (typeof data === 'object') {
						let replaced = await replaceImageColor(
							data,
							background,
							errorObject
						);
						if (replaced) {
							background = replaced;
						}
					} else {
						errorObject.errors.push("Property 'replaceColor' is not an object");
					}
					break;
				}
				case 'images':
				case 'children': {
					// TODO maybe change this ugly nested JSON parsing
					try {
						data = JSON.parse(data);
					} catch (e) {}
					// * Error if invalid or not an array
					if (!data) {
						errorObject.errors.push("Invalid property '" + key + "'");
					} else if (!Array.isArray(data)) {
						errorObject.errors.push("Property '" + key + "' is not an array");
					} else {
						let images = await handleChildren(data, background, errorObject);
						if (images) {
							background = images;
						}
					}
					break;
				}
				case 'text':
				case 'txt': {
					try {
						data = JSON.parse(data);
						if (typeof data === 'number') {
							data = data.toString();
						}
					} catch (e) {}
					if (Array.isArray(data)) {
						for (var i = 0; i < data.length; i++) {
							let generatedTxt = await generateTxt(
								data[i],
								background,
								i,
								errorObject
							);
							if (generatedTxt) {
								background = generatedTxt;
							}
						}
					} else {
						let generatedTxt = await generateTxt(
							data,
							background,
							null,
							errorObject
						);
						if (generatedTxt) {
							background = generatedTxt;
						}
					}
					break;
				}
				case 'opacity':
				case 'o': {
					data = parseInt(data);
					if (isNaN(data)) {
						errorObject.errors.push("Property '" + key + "' is not a number");
					} else {
						background.opacity(data / 100);
					}
					break;
				}
				case 'rotate':
				case 'r': {
					data = parseInt(data);
					if (isNaN(data)) {
						errorObject.errors.push("Property '" + key + "' is not a number");
					} else {
						background.rotate(-data);
					}
					break;
				}
				case 'shape':
				case 's': {
					switch (data.toLowerCase()) {
						case 'circle': {
							let smallest =
								background.bitmap.width < background.bitmap.height
									? background.bitmap.width
									: background.bitmap.height;
							let x = Math.round((background.bitmap.width - smallest) / 2);
							let y = Math.round((smallest - background.bitmap.height) / 2);
							background.crop(x, y, smallest, smallest);
							background.background(0x000000);
							background.mask(
								circleMask.clone().resize(smallest, smallest),
								0,
								0
							);
							if (body.outline) {
								try {
									body.outline = JSON.parse(body.outline);
								} catch (e) {}
								if (typeof body.outline !== 'object') {
									errorObject.errors.push(
										"Property 'outline' is not an object"
									);
								} else {
									background = await outlineCircle(
										body.outline,
										background,
										errorObject
									);
								}
							}
							break;
						}
					}
				}
				case 'crop': {
					try {
						data = JSON.parse(data);
					} catch (e) {}

					if (!isNaN(parseInt(data))) {
						data = {
							x: 0,
							y: 0,
							w: parseInt(data),
							h: parseInt(data),
						};
					}

					if (typeof data === 'object') {
						let cropProperties = Object.keys(data);
						// ? This just parses number I guess it's ugly
						for (
							var cropPropertyIndex = 0;
							cropPropertyIndex < cropProperties.length;
							cropPropertyIndex++
						) {
							data[cropProperties[cropPropertyIndex]] = !isNaN(
								parseInt(data[cropProperties[cropPropertyIndex]])
							)
								? parseInt(data[cropProperties[cropPropertyIndex]])
								: data[cropProperties[cropPropertyIndex]];
						}

						[w, h, x, y] = [
							data.w !== undefined ? data.w : background.bitmap.width,
							data.h !== undefined ? data.h : background.bitmap.height,
							data.x !== undefined ? data.x : 0,
							data.y !== undefined ? data.y : 0,
						];
						background.crop(x, y, w, h);
					} else if (typeof data === 'string') {
						if (data.toLowerCase() === 'auto') {
							// TODO auto crop implementation
							background.autocrop(false);
						}
					} else {
						errorObject.errors.push(
							"Unrecognized value with type '" +
								typeof data +
								"' of property '" +
								key +
								"'"
						);
					}
					break;
				}
				default: {
					let exceptions = ['size', 'align', 'alignment', 'x', 'y', 'outline'];
					if (exceptions.includes(key)) break;
					errorObject.errors.push("Unrecognized property '" + key + "'");
				}
			}
		}
		return resolve([background, errorObject]);
	});
}

// * For generating text png using the text2png package
async function generateTxt(data, image, textIndex = null, errorObject) {
	try {
		switch (typeof data) {
			case 'string': {
				errorObject.warnings.push(
					"Property 'text' is 'string' but expected 'object'. Assuming " +
						data +
						" is 'text'."
				);
				return await generateTxt(
					{
						text: data,
					},
					image,
					textIndex,
					errorObject
				);
			}
			case 'object': {
				let textObj = Object.assign({}, defaultTextOptions, data);
				let text = textObj.text || textObj.txt;
				if (!text) {
					errorObject.errors.push(
						"Empty 'text' property" +
							(textIndex ? ' at index: ' + textIndex + '.' : '.')
					);
					return false;
				}
				if (textObj.size && !isNaN(parseInt(textObj.size))) {
					let size = parseInt(textObj.size);
					textObj.font = textObj.font.replace('30px', size + 'px');
				}
				let x = !isNaN(parseInt(textObj.x)) ? parseInt(textObj.x) : 0;
				let y = !isNaN(parseInt(textObj.y)) ? parseInt(textObj.y) : 0;

				if (!textObj.maxWidth) {
					textObj.maxWidth = image.bitmap.width - x;
				}
				let textBuffer = txt2png(textObj.text || textObj.txt, textObj);
				let textImage = await new Promise((res, rej) => {
					Jimp.read(textBuffer).then(res).catch(rej);
				});
				let align = textObj.alignment || textObj.align;
				if (align) {
					switch (align.toLowerCase()) {
						case 'top-left': {
							image.composite(textImage, x, y);
							return image;
						}
						case 'top-middle': {
							let baseX = Math.round(
								(image.bitmap.width - textImage.bitmap.width) / 2
							);
							x += baseX;
							image.composite(textImage, x, y);
							return image;
						}
						case 'top-right': {
							let baseX = Math.round(
								image.bitmap.width - textImage.bitmap.width
							);
							x += baseX;
							image.composite(textImage, x, y);
							return image;
						}
						case 'left': {
							let baseY = Math.round(
								(image.bitmap.height - textImage.bitmap.height) / 2
							);
							y += baseY;
							image.composite(textImage, x, y);
							return image;
						}
						case 'center': {
							let baseX = Math.round(
								(image.bitmap.width - textImage.bitmap.width) / 2
							);
							let baseY = Math.round(
								(image.bitmap.height - textImage.bitmap.height) / 2
							);
							x += baseX;
							y += baseY;
							image.composite(textImage, x, y);
							return image;
						}
						case 'right': {
							let baseX = Math.round(
								image.bitmap.width - textImage.bitmap.width
							);
							let baseY = Math.round(
								(image.bitmap.height - textImage.bitmap.height) / 2
							);
							x += baseX;
							y += baseY;

							image.composite(textImage, x, y);
							return image;
						}
						case 'bot-left': {
							let baseY = Math.round(
								image.bitmap.height - textImage.bitmap.height
							);
							y += baseY;
							image.composite(textImage, x, y);
							return image;
						}
						case 'bot-middle': {
							let baseX = Math.round(
								(image.bitmap.width - textImage.bitmap.width) / 2
							);
							let baseY = Math.round(
								image.bitmap.height - textImage.bitmap.height
							);
							x += baseX;
							y += baseY;
							image.composite(textImage, x, y);
							return image;
						}
						case 'bot-right': {
							let baseX = Math.round(
								image.bitmap.width - textImage.bitmap.width
							);
							let baseY = Math.round(
								image.bitmap.height - textImage.bitmap.height
							);
						}

						default: {
							errorObject.errors.push(
								"Invalid alignment mode inside 'text' property"
							);
							image.composite(textImage, x, y);
							return image;
						}
					}
				} else {
					image.composite(textImage, x, y);
					return image;
				}
			}
			default:
				errorObject.errors.push(
					"Property 'text' is '" + typeof data + "' but expected 'object'"
				);
				return false;
		}
	} catch (e) {
		// ! Not sure about this but the error should be inside the errorObject so....
		return false;
	}
}

async function outlineCircle(data, image, errorObject) {
	if (!data.width) {
		data.width = 4;
	} else if (isNaN(parseInt(data.width))) {
		errorObject.errors.push("Width is not a number in 'outline' property");
		return image;
	} else {
		data.width = parseInt(data.width);
	}
	let circle = circleMask.clone();
	let black = blackImage.clone();
	circle.resize(
		2 * data.width + image.bitmap.width,
		2 * data.width + image.bitmap.width
	);
	black.resize(
		2 * data.width + image.bitmap.width,
		2 * data.width + image.bitmap.width
	);
	black.mask(circle, 0, 0);

	let whiteImage = (
		await replaceColor({
			image: black.clone(),
			colors: {
				type: 'hex',
				targetColor: '#000000',
				replaceColor: '#FFFFFF',
			},
			deltaE: 20,
		})
	).resize(image.bitmap.width, image.bitmap.width);

	black.composite(whiteImage, data.width, data.width);
	black = await replaceColor({
		image: black,
		colors: {
			type: 'hex',
			targetColor: '#FFFFFF',
			replaceColor: '#00000000',
		},
		deltaE: 70,
	});
	black = await replaceColor({
		image: black,
		colors: {
			type: 'hex',
			targetColor: '#000000',
			replaceColor: data.color,
		},
		deltaE: 70,
	});
	black.composite(image, data.width, data.width);
	return black;
}

async function replaceImageColor(data, image, errorObject) {
	try {
		return await replaceColor({
			image: image,
			colors: {
				type: 'hex',
				targetColor: data.target,
				replaceColor: data.replace,
			},
			deltaE: data.delta || 2.3,
		});
	} catch (e) {
		errorObject.errors.push(
			'Something went wrong when replacing the color' + e.message
		);
		return false;
	}
}

async function handleChildren(data, background, errorObject) {
	// * Loop through all the images and place them on the background
	/**
	 * ? As the images are placed in order, the order of images is essentially the order of the layers too
	 * ? First element in the array will be the lowest layer and thus displayed below the second element
	 */
	for (var j = 0; j < data.length; j++) {
		let imageObj = data[j];
		try {
			let [image, childErrorObject] = await processJimp(imageObj);
			errorObject.childrenObjects.push(childErrorObject);
			if (imageObj.size) {
				switch (imageObj.size.toLowerCase()) {
					// ! This only downscales the image if necessary. This doesn't upscale the image if it fits in the parent
					case 'contain': {
						if (
							image.bitmap.width > background.bitmap.width ||
							image.bitmap.height > background.bitmap.height
						) {
							image.scaleToFit(
								background.bitmap.width,
								background.bitmap.height
							);
						}
						break;
					}
				}
			}
			let x = !isNaN(parseInt(imageObj.x)) ? parseInt(imageObj.x) : 0;
			let y = !isNaN(parseInt(imageObj.y)) ? parseInt(imageObj.y) : 0;

			let align = imageObj.alignment || imageObj.align;
			if (align) {
				switch (align.toLowerCase()) {
					case 'top-left': {
						background.composite(textImage, x, y);
						break;
					}
					case 'top-middle': {
						let baseX = Math.round(
							(background.bitmap.width - image.bitmap.width) / 2
						);
						x += baseX;
						background.composite(textImage, x, y);
						break;
					}
					case 'top-right': {
						let baseX = Math.round(
							background.bitmap.width - image.bitmap.width
						);
						x += baseX;
						background.composite(textImage, x, y);
						break;
					}
					case 'left': {
						let baseY = Math.round(
							(background.bitmap.height - image.bitmap.height) / 2
						);
						y += baseY;
						background.composite(textImage, x, y);
						break;
					}
					case 'center': {
						let baseX = Math.round(
							(background.bitmap.width - image.bitmap.width) / 2
						);
						let baseY = Math.round(
							(background.bitmap.height - image.bitmap.height) / 2
						);
						x += baseX;
						y += baseY;
						background.composite(textImage, x, y);
						break;
					}
					case 'right': {
						let baseX = Math.round(
							background.bitmap.width - image.bitmap.width
						);
						let baseY = Math.round(
							(background.bitmap.height - image.bitmap.height) / 2
						);
						x += baseX;
						y += baseY;

						background.composite(textImage, x, y);
						break;
					}
					case 'bot-left': {
						let baseY = Math.round(
							background.bitmap.height - image.bitmap.height
						);
						y += baseY;
						background.composite(textImage, x, y);
						break;
					}
					case 'bot-middle': {
						let baseX = Math.round(
							(background.bitmap.width - image.bitmap.width) / 2
						);
						let baseY = Math.round(
							background.bitmap.height - image.bitmap.height
						);
						x += baseX;
						y += baseY;
						background.composite(textImage, x, y);
						break;
					}
					case 'bot-right': {
						let baseX = Math.round(
							background.bitmap.width - image.bitmap.width
						);
						let baseY = Math.round(
							background.bitmap.height - image.bitmap.height
						);
						x += baseX;
						y += baseY;
						break;
					}
					case 'center': {
						let baseX = Math.round(
							(background.bitmap.width - image.bitmap.width) / 2
						);
						let baseY = Math.round(
							(background.bitmap.height - image.bitmap.height) / 2
						);
						x += baseX;
						y += baseY;
						background.composite(image, x, y);
						break;
					}
				}
			} else {
				background.composite(image, x, y);
			}
		} catch (e) {
			errorObject.childrenObjects.push(e);
			return background;
		}
	}
	return background;
}

// ? For returning stored images
router.get('/:image', async (req, res) => {
	if (fs.existsSync(__dirname + '/cached/' + req.params.image)) {
		res.sendFile(__dirname + '/cached/' + req.params.image);
	} else {
		res.send(req.params.image + " doesn't exist.");
	}
});

// ? For getting the image
router.get('/', async (req, res) => {
	if (!req.query || Object.values(req.query).length === 0) {
		return res.send('Error rendering content');
	}
	try {
		let image = await processJimp(req.query);
		image[0].write(__dirname + '/cached/test.png', () =>
			res.sendFile(__dirname + '/cached/test.png')
		);
	} catch (e) {
		console.error(e);
		res.send('Error rendering content');
	}
});

// ? For getting the image path and errors/warnings
router.post('/', async (req, res) => {
	let processedJimp = [];
	try {
		processedJimp = await processJimp(req.body);
	} catch (e) {
		processedJimp[1] = e;
	}
	let imagePath = Object.keys(req.body).reduce((acc, item) => {
		return (
			acc +
			`${item}=${
				typeof req.body[item] === 'object'
					? JSON.stringify(req.body[item])
					: req.body[item]
			}&`
		);
	}, '?');
	processedJimp[1] = Object.assign(
		{
			root: 'https://api.nicelink.xyz/jimp',
			path: imagePath,
		},
		processedJimp[1]
	);
	res.type('json').send(JSON.stringify(processedJimp[1], null, 2));
});

router.post('/multiple', async (req, res) => {
	if (!req.body || !req.body.sources) {
		return res.type('json').send(
			JSON.stringify({
				error: 'Sources property not set.',
			})
		);
	}

	if (!Array.isArray(req.body.sources)) {
		return res.type('json').send(
			JSON.stringify({
				error: 'Sources property is not an array.',
			})
		);
	}

	let sources = req.body.sources.map((src) => {
		let uniqueID = uuidv4();
		return {
			uniqueID,
			body: src,
		};
	});
	sources = await Promise.all(
		sources.map((src) => {
			return new Promise((resolve, reject) => {
				processJimp(src.body)
					.then((processed) => {
						processed[0].write(__dirname + '/cached/' + src.uniqueID + '.png');
						resolve(
							Object.assign(
								{
									root: 'https://api.nicelink.xyz/jimp',
									path: processed[1].error ? null : '/' + src.uniqueID + '.png',
								},
								processed[1]
							)
						);
					})
					.catch((e) => {
						let returnObject = [null, {}];
						returnObject[1] = e;
						returnObject[1].error = true;
						resolve(
							Object.assign(
								{
									root: 'https://api.nicelink.xyz/jimp',
									path: returnObject[1].error
										? null
										: '/' + src.uniqueID + '.png',
								},
								returnObject[1]
							)
						);
					});
			});
		})
	);
	res.type('json').send(JSON.stringify(sources, null, 2));
});
router.post('/store', async (req, res) => {
	let processedJimp = [null, {}];
	let uniqueID = uuidv4();
	try {
		processedJimp = await processJimp(req.body);
		processedJimp[0].write(__dirname + '/cached/' + uniqueID + '.png');
	} catch (e) {
		processedJimp[1] = e;
		processedJimp[1].error = true;
	}
	// ! let imagePath = Object.keys(req.body).reduce((acc, item) => {
	// !    return acc + `${item}=${req.body[item]}&`
	// ! }, '?');
	processedJimp[1] = Object.assign(
		{
			root: 'https://api.nicelink.xyz/jimp',
			path: processedJimp[1].error ? null : '/' + uniqueID + '.png',
		},
		processedJimp[1]
	);
	res.type('json').send(JSON.stringify(processedJimp[1], null, 2));
});

// ? Transparent image
router.get('/transparent.png', (req, res) => {
	res.sendFile(__dirname + '/transparent.png');
});

module.exports = router;
