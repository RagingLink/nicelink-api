---
title: Sharp
language_tabs:
  - shell : cURL
  - powershell:  BBTag
includes: []
search: true
highlight_theme: monokai
headingLevel: 3
code_clipboard: true
---

<!-- Generator: Widdershins v4.0.1 -->

# Endpoints
[https://api.nicelink.xyz/sharp](https://api.nicelink.xyz/sharp) 

The `/jimp` endpoint is now an alias of `/sharp`, but might be removed in favour of `/sharp`.

[sharp.js](https://github.com/lovell/sharp) is the library used for image manipulation. In general the features supported by Sharp.js are supported by this API.

## Get an image

> Get image

```shell
curl -X get \
  https://api.nicelink.xyz/sharp/transparent.png
```

```powershell
{output;
  {file;buffer:{jget;{request;https://api.nicelink.xyz/sharp/transparent.png};body}};transparent.png}
}
{//;More likely would be to just display the URL}
https://api.nicelink.xyz/sharp/transparent.png
```

> Response (Image Buffer)

`GET https://api.nicelink.xyz/sharp/:imageName`

Any image stored can be retrieved by using the name of the image provided by an endpoint like `/store`.

## Analyze image

> Example request

```shell
curl -X POST -H "Content-Type: application/json" \
    -d '{"background": "https://example.com/image.png"}' \
    https://api.nicelink.xyz/sharp
```

```powershell
{set;~payload;{json;{

  "background": "https://example.com/image.png"
}}}

{jget;{request;https://api.nicelink.xyz/sharp;{jset;;method;POST};{get;~payload}};body}
```

> JSON response:

```json
{
  "errors" : ["Invalid background image"],
  "warnings" : [],
  "children" : []
}
```

`POST https://api.nicelink.xyz/jimp`

**Request body is an [ImageObject](#image-object)**

<aside class="notice">This doesn't take into account the various things that could go wrong when actually generating the image. This endpoint should be a treated as a way to confirm your input is valid</aside>

## Generate image

> Example request

```shell
curl -X POST -H "Content-Type: application/json" \
  -d {"background": "https://api.nicelink.xyz/sharp/transparent.png", "text": [{"text": "Hello world!"}], "crop": "auto"} \
  https://api.nicelink.xyz/sharp/process
```

```powershell
{set;~json;{json;{
    "background": "https://api.nicelink.xyz/sharp/transparent.png",
    "text": [
        {
            "text": "Hello world!"
        }
    ],
    "crop": "auto"
}}}
{set;~response;{request;https://api.nicelink.xyz/sharp/store;{jset;;method;POST};{get;~json}}}

{file;buffer:{jget;~response;body};image.png}
```

> Returns an image

`POST https://api.nicelink.xyz/sharp/process`

**Request body must be an [ImageObject](#image-object)**

This endpoints directly returns the generated image

## Store image

> Example request

```shell
curl -X POST -H {"Content-Type: application/json"} \
  -d {"background": "https://api.nicelink.xyz/sharp/transparent.png", "cacheDuration": 7, "text": [{"text": "Hello world!"}], "crop": "auto"} \
  https://api.nicelink.xyz/sharp/store
```

```powershell
{set;~json;{json;{
  "background": "https://api.nicelink.xyz/sharp/transparent.png", 
  "cacheDuration": 7, 
  "text": [
    {
      "text": "Hello world!"
    }
  ],
  "crop": "auto"
}}}
{set;~response;{request;https://api.nicelink.xyz/sharp/store;{jset;;method;POST};{get;~json}}}

{jget;~response;body}
```

> JSON Response:

```json
{
  "root" : "https://api.nicelink.xyz/sharp/",
  "path" : "d7596506-9ee8-4a42-8cea-b51670378920.png",
  "url" : "https://api.nicelink.xyz/sharp/d7596506-9ee8-4a42-8cea-b51670378920.png",
  "errors" : [],
  "warnings" : [],
  "children" : []
}
```

`POST https://api.nicelink.xyz/sharp/store`

**Request body must be an [ImageObject](#image-object)**

This endpoint allows you to store an image for a determined amount of time (`cacheDuration`). `GET`ting an image extends the duration it's stored for by `cacheDuration`.

After `cacheDuration` days have passed since the last access the image will be deleted. `GET`ting the image after this will re-generate the image and re-store it. 90 days after its last access the image will be permanently gone.

<aside class="notice">
  <code>/store</code> isn't supposed to be a way to just store your images for free. At any point in time images may be removed and wiped to preserve disk space. <code>/store</code> should be treated as a way to store a generated image for a short period. If you want to store an image for a long period please resort to other storage methods.
</aside>





# Input Bodies
## Image Object

> **Example actions**:

> Replacing a colour:

```json
{
  "bg": "https://api.nicelink.xyz/docs/images/logo.png",
  "replaceColor": {
    "target" : "#000000",
    "replace" : "#00FF00",
    "delta" : 50
  }
}
```

> [Response image](https://api.nicelink.xyz/sharp/aced174d-d4c6-413b-98c6-daf75edbe65d.png) 

> Hello world:

```json
{
    "background": "https://api.nicelink.xyz/sharp/transparent.png",
    "text": [
        {
            "text": "Hello world!"
        }
    ],
    "crop": "auto"
}
```

> [Response image](https://api.nicelink.xyz/sharp/d7596506-9ee8-4a42-8cea-b51670378920.png)

> Add some eyes to the logo:

```json
{
    "bg": "https://api.nicelink.xyz/docs/images/logo.png",
    "images": [
        {
            "bg": "https://api.nicelink.xyz/sharp/edcd1b62-911a-4b5b-804a-a82d72b90060.png",
            "align": "center",
            "x": -125,
            "y": -50,
            "width": 100
        },
        {
            "bg": "https://api.nicelink.xyz/sharp/edcd1b62-911a-4b5b-804a-a82d72b90060.png",
            "align": "center",
            "x": 125,
            "y": -50,
            "width": 100
        }
    ]
}
```

> [Response image](https://api.nicelink.xyz/sharp/4a003a05-3ae6-4f96-8922-a0ea353b5a26.png)

<aside class="notice">
  Properties are case-sensitive
</aside>
<aside class="notice">
  If an alias is provided in combination with its main property, the alias is discarded
</aside>


Property      | Alias    | Type                                                            | Default                                                          | Description
--------------|----------|-----------------------------------------------------------------|------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
background    | bg       | `string`                                                        | [transparent.png](https://api.nicelink.xyz/jimp/transparent.png) | URL of the background to use.
cacheDuration |          | `number`                                                        | `7`                                                              | When using the `/store` endpoint this will determine the amount of days the image is stored for. Maximum of 30 days.
width         | w        | `number`                                                        | Original width                                                   | Width of the image.
height        | h        | `number`                                                        | Original height                                                  | Height of the image.
opacity       | o        | `number`                                                        | `100`                                                            | Opacity of the image ranging from 0-100
rotate        | r        | `number`                                                        | `0`                                                              | Clockwise rotation of the image in degrees.
shape         | s        | `string`                                                        | `undefined`                                                      | Shape of the image. Can be `circle`.
flip          |          | `number`                                                        | `undefined`                                                      | Flips the image horizontally or vertically. Accepted values are `1` (horizontal flip), `2` (vertical flip) and `3` (horizontal + vertical flip)
images        | children | `ChildObject[]`                                                 | `[]`                                                             | Array with [ChildObject](#child-object)s.
text          | txt      | [<code>TextObject&#124;TextObject[]</code>](#text-object)       | `undefined`                                                      | Renders text on the image
crop          |          | <code>[CropObject](#crop-object)&#124;number&#124;"auto"</code> | `undefined`                                                      | Crops the image based on the parameters provided. Argument can be a number in which case it will crop from `x = 0` and `y = 0` until `x = number` and `y = number`. Or the argument can be a CropObject or `"auto"` which trims the transparent region around the image.
replaceColor  |          | [`ReplaceColorObject`](#replace-color-object)                   | `undefined`                                                      | Replaces a certain colour with another colour

## Child Object

> **Example action**:

> Creating a triangle shape

```json
{
    "bg": "https://api.nicelink.xyz/docs/images/logo.png",
    "images": [
        {
            "bg": "https://api.nicelink.xyz/sharp/958d2e27-2c35-421b-8643-03b237e428c1.png",
            "rotate": 180,
            "align": "center",
            "y": 50,
            "blendMode": "dstIn",
            "size": "contain"
        }
    ]
}
```

> [Response image](https://api.nicelink.xyz/sharp/e0d28934-0206-4890-860e-5078a4e5c298.png)

A `ChildObject` supports all the properties of `InputBody`, in addition to the following properties:

Property  | Alias | Type     | Default     | Description
----------|-------|----------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
x         |       | `number` | `0`         | Horizontal position of the image on the parent image.
y         |       | `number` | `0`         | Vertical position of the image on the parent image.
alignment | align | `string` | `undefined` | Determines how the child image is aligned on the parent image. Can be any of the modes listed at **[Supported alignment modes](#supported-alignment-modes)**. **If this property is provided in combination with `x` and/or `y`, `x` and `y` will be the offset.**
size      |       | `string` | `undefined` | Can be `contain`. `contain` scales the child image down so it fits inside the parent element.
blendMode |       | `string` | `srcOver`   | Blend mode to use when composting the child image on the parent image. A list of blend modes can be found at **[Blend modes](#blend-modes)**

## Text Object

> Example actions:

> Simple progressbar with percentage in it

```json
{
    "bg": "https://api.nicelink.xyz/misc/progressbar?percentage=50&colour=lime",
    "text": [{
        "text" : "50%",
        "color" : "white",
        "strokeColor": "black",
        "padding": 3,
        "strokeWidth": 3,
        "align": "center"
    }]
}
```

> [Response image](https://api.nicelink.xyz/sharp/1f45f301-4779-4e96-81b4-49421ed92214.png)

Property          | Alias   | Type     | Default               | Description
------------------|---------|----------|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
x                 |         | `number` | `0`                   | x coordinate/offset of the text block.
y                 |         | `number` | `0`                   | y coordinate/offset of the text block.
alignment         | align   | `string` | `top-left`            | Determines how the text is aligned on the parent image.. Can be any of the modes listed at **[Supported alignment modes](#supported-alignment-modes)**
size              |         | `number` | `30`                  | Pixel size of the text.
font              |         | `string` | `30px sans-serif`     | Font must be of the format `SIZEpx FONT` where `SIZE` is the text size and `FONT` is the font you want to use. **This property DOES NOT returns errors if the font is invalid. In general this property should NOT be used.**
textAlign         |         | `string` | `left`                | Alignment mode of the text inside the text block. This is **not** the same as the `align` property.
textColor         | color   | `string` | `black`               | Color of the text.
backgroundColor   | bgColor | `string` | `transparent`         | Color of the background.
lineSpacing       |         | `number` | `0`                   | Amount of spacing between lines.
maxWidth          |         | `number` | `width of parent - x` | Max width of the text block. Defaults to the width of the parent image minus the `x` offset.
strokeWidth       |         | `number` | `0`                   | Width of the text stroke in pixels.
strokeColor       |         | `string` | `white`               | Color of the text stroke.
                  |         |          |                       | When using a stroke, the padding might need to be increased to avoid cutting off the stroke. Setting padding to the width of the stroke is usually enough.
padding`{SIDE}`   |         | `number` | `0`                   | Padding in pixels on `{SIDE}`, where `{SIDE}` can be `left`, `right`, `top` and `bottom`. (`paddingLeft`, `paddingRight` etc.)
padding           |         | `number` | `0`                   | The `padding` property is only used for a side if the side-specific property is not provided.
border{SIDE}Width |         | `number` | `0`                   | Width of the border on `{SIDE}`. (`borderBottomWidth`, `borderLeftWidth` etc.)
borderWidth       |         | `number` | `0`                   | The `borderWidth` property is only used for a side if the side-specific property is not provided.
borderColor       |         | `string` | `black`               | Color of the border.

## Crop Object

> Example Object

```json
{
  "x": 30,
  "y": 12,
  "w": 1000
}
```

Property | Alias | Type     | Default        | Description
---------|-------|----------|----------------|--------------------------------
x        |       | `number` | `0`            | X position to start the crop at
y        |       | `number` | `0`            | Y position to start the crop at
width    | w     | `number` | `Image width`  | The width of the crop region
height   | h     | `number` | `Image height` | The height of the crop region

## Replace Color Object

> Example Object

```json
{
  "target": "#FF0000",
  "replace": "#00FF00"
}
```

Property | Type     | Default | Description
---------|----------|---------|--------------------------------------------------------------------------------------
target   | `string` |         | Target hex colour
replace  | `string` |         | Replacement hex colour
delta    | `number` | `2.3`   | The deltaE value to use, more info [here](http://zschuessler.github.io/DeltaE/learn/)

## Supported alignment modes
<table>
<tr>
    <td>top-left</td>
    <td>top-middle</td>
    <td>top-right</td>
</tr>
<tr>
    <td>left</td>
    <td>center</td>
    <td>right</td>
</tr>
<tr>
    <td>bot-left</td>
    <td>bot-middle</td>
    <td>bot-right</td>
</tr>
</table>

## Blend modes

For more information about the blend modes visit [libvips blendmode](https://www.libvips.org/API/current/libvips-conversion.html#VipsBlendMode) and [cairographics compositing operators](https://www.cairographics.org/operators/)

Supported modes are: `srcOver`, `srcIn`, `srcOut`, `srcAtop`, `dstIn`, `dstOut`, `dstAtop`, `dstOver`, `hardLight`, `softLight`, `colourDodge`, `colourBurn`, `add`, `screen`, `overlay`, `lighten`, `darken`, `multiply`, `difference`, `exclusion`, `clear`, `source`, `saturate`, `xor` and `dest`

