---
title: Nice link!
language_tabs:
  - shell : cURL
includes: []
search: true
highlight_theme: darkula
headingLevel: 2
code_clipboard: true
---

<!-- Generator: Widdershins v4.0.1 -->

#JIMP
> Base API URL:
```
https://api.nicelink.xyz/jimp
```
This endpoint interacts with [JIMP](https://www.npmjs.com/package/jimp) in Node.js. At its core this endpoint interacts with as many function from JIMP as possible, if a method/function isn't mentioned on this page, it's **NOT** supported.

##Analyze request
>Example request
```shell
curl -X POST -H "Content-Type: application/json" \
    -d '{"background": "https://example.com/image.png"}' \
    https://api.nicelink.xyz/jimp
```
> The above command returns JSON structured like:
```json
{
  "root" : "https://api.nicelink.xyz/jimp",
  "path" : "?background=https://example.com/image.png&",
  "src" : "https://example.com/image.png",
  "errors" : ["Invalid background image"],
  "warnings" : [],
  "childrenObjects" : []
}
```

`POST https://api.nicelink.xyz/jimp`

###Supported root image properties
|Property|Alias|Default|Description|
|-|-|-|-|
background|bg|[transparent.png](https://api.nicelink.xyz/jimp/transparent.png)|URL of the background to use.
width|w|Original width|Width of the image.
height|h|Original height|Height of the image.
opacity|o|`100`|Opacity of the image ranging from 0-100
rotate|r|`0`|Clockwise rotation of the image in degrees.
shape|s|`undefined`|Shape of the image. Can be `circle`.
flip|mirror|`false`|Flips the image horizontally or vertically. Valid values are: `hor, horizontal, ver, vertical`. If `true` is provided, the image will be flipped horizontally
images|children|`[]`|Array of image Objects. All `root image` properties can be used, and all the `child image` properties below. Child images can also have their own children.
text|txt|`undefined`|Can be an array of objects, a single object or a string with the text to display. **It's recommended to provide an object for more control of the text. For information about the supported properties visit the [text](https://api.nicelink.xyz/docs/jimp#text) section**
crop||`undefined`|Crops the image based on the argument provided. Argument can be a number in which case it will crop from `x = 0` and `y = 0` until `x = number` and `y = number`. Or the argument can be an object with properties `x, y, w, h` where it will start cropping from `x` and `y` until `w` (width) and `h` (height).
replacecolor||`undefined`|Object with properties `target` and `replace`. `target` is the color to be replaced, and `replace` is the color it will be replaced with. An optional property `delta` can also be provided, this is the `deltaE` value (more info [here](http://zschuessler.github.io/DeltaE/learn/)). Defaults to `2.3`.

<aside class="notice">
If a <code>property</code> is provided in combination with its <code>alias</code>, the <code>property</code> will take priority. If the value is invalid, <i>then</i> the <code>alias</code> will be used.
</aside>

###Supported child image properties

|Property|Alias|Default|Description|
|-|-|-|-|
x||`0`|Horizontal position of the image on the parent image.
y||`0`|Vertical position of the image on the parent image.
alignment|align|`undefined`|Alignment of the image on the parent image. Can be any of the modes listed under "[Supported alignment modes](https://api.nicelink.xyz/docs/jimp#supported-alignment-modes)". **If this property is provided in combination with `x` and/or `y`, `x` and `y` will be the offset.**
size||`undefined`|Can be `contain`. `contain` scales the child image down so it fits inside the parent element.
blendMode||`srcOver`|Blend mode to use when composting the child image on the parent image. A list of blend modes can be found below under [Blend modes](https://api.nicelink.xyz/docs/jimp#blend-modes)
blendOpacitySrc||`1`|Opacity of the src/child image.
blendOpacityDest||`1`|Opacity of the destination/parent image.

###Supported alignment modes
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

###Blend modes
The following blend modes are supported (case-insensitive):
- srcOver
- dstOver
- multiply 
- add
- screen
- overlay
- darken
- lighten
- hardLight
- difference
- exclusion.

##Retrieve image

>Example request
```shell
curl https://api.nicelink.xyz/jimp?background=https%3A%2F%2Fexample.com%2Fimage.png
```
> The above command returns an image or `Error rendering content`

`GET https://api.nicelink.xyz/jimp`

The above listed properties can be used as parameters for `GET` requests too. But then they will need to be uriencoded properly.
<aside class="warning">
It's recommended to use the <code>POST</code> method to interact with the API, as this returns the URL in the right format and includes warnings/errors it encountered.
In the end a <code>GET</code> request will have to be made to retrieve the image though.
</aside>

<aside class="notice">
This endpoint does <b>not</b> store images. Every request has to be processed and rendered. If you want to store images you need to use the <code>/store</code> endpoint
</aside>

#Store images
##POST request
>Example request

```shell
curl -X POST -H "Content-Type: application/json" \
    -d '{"background": "https://cdn.discordapp.com/avatars/278237925009784832/b5cb6aae1473042ed2a7f7e51928d9ea.png?size=512"}' \
    https://api.nicelink.xyz/jimp/store
```
> The above command returns JSON structured like:
```json
{
  "root" : "https://api.nicelink.xyz/jimp",
  "path" : "/795c8388-d36a-4499-a7c5-4995a4ee01c2.png",
  "src" : "https://example.com/image.png",
  "errors" : ["Invalid background image"],
  "warnings" : [],
  "childrenObjects" : []
}
```

`POST https://api.nicelink.xyz/jimp/store`

This request uses the same properties and logic `POST https://api.nicelink.xyz/jimp` uses.

<aside class="warning">
If there are any major errors when rendering the image, the response object will include <code>"error" : true</code>, and set <code>path</code> to <code>null</code>.
</aside>

##Retrieve stored image
>Example request

```shell
curl https://api.nicelink.xyz/jimp/795c8388-d36a-4499-a7c5-4995a4ee01c2.png
```
>The above command returns an image or *filename* doesn't exist

`GET https://api.nicelink.xyz/jimp/imageID.png`


##Text

###Supported text properties
Property|Alias|Default|Description
|-|-|-|-|
x||`0`|x coordinate/offset of the text block.
y||`0`|y coordinate/offset of the text block.
align||`top-left`|Alignment mode of the text block. Alignment modes can be seen in the [Supported alignment modes](https://api.nicelink.xyz/docs/jimp#supported-alignment-modes) section
size||`30`|Pixel size of the text.
font||`30px sans-serif`|Font must be of the format `SIZEpx FONT` where `SIZE` is the text size and `FONT` is the font you want to use. **This property DOES NOT returns errors if the font is invalid. In general this property should NOT be used.**
textAlign||`left`|Alignment mode of the text inside the text block. This is **not** the same as the `align` property.
textColor|color|`black`|Color of the text.
backgroundColor|bgColor|`transparent`|Color of the background.
lineSpacing||`0`|Amount of spacing between lines.
maxWidth||`width of parent - x`|Max width of the text block. Defaults to the width of the parent image minus the `x` offset.
strokeWidth||`0`|Width of the text stroke in pixels.
strokeColor||`white`|Color of the text stroke.
||||When using a stroke, the padding might need to be increased to avoid cutting off.
paddingLeft|padding|`0`|Padding in pixels on the left side.
paddingRight|padding|`0`|Padding in pixels on the right side.
PaddingTop|padding|`0`|Padding in pixels on the top side.
paddingBottom|padding|`0`|Padding in pixels on the bottom side.
||||The `padding` property is only used for a side if the side-specific property is not provided.
borderLeftWidth|borderWidth|`0`|Width of the border on the left side.
borderRightWidth|borderWidth|`0`|Width of the border on the right side.
borderTopWidth|borderWidth|`0`|Width of the border on the top side.
borderBottomWidth|borderWidth|`0`|Width of the border on the bottom side.
||||The `borderWidth` property is only used for a side if the side-specific property is not provided.
borderColor||`black`|Color of the border.