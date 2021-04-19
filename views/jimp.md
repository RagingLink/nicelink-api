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
This endpoint interacts with [JIMP](https://www.npmjs.com/package/jimp) in Node.js. At its core this endpoint interacts with as many function from JIMP as possible, if a method/function isn't mentioned on this page, it's **NOT** supported.

**Base API URL**:
```
https://api.nicelink.xyz/jimp
```
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
images|children|`[]`|Array of image Objects. All base-images can be used, and all the `child-image` properties below. Child images can also have their own children.

<aside class="notice">
If a <code>property</code> is provided in combination with its <code>alias</code>, the <code>property</code> will take priority. If the value is invalid, <i>then</i> the <code>alias</code> will be used.
</aside>

###Supported child image properties

|Property|Alias|Default|Description|
|-|-|-|-|
x||`0`|Horizontal position of the image on the parent image.
y||`0`|Vertical position of the image on the parent image.
alignment|align|`undefined`|Alignment of the image on the parent image. Can be `center`. **If this property is provided in combination with `x` and/or `y`, `x` and `y` will be the offset.**

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

