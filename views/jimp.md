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
  "path" : "",
  "src" : "https://example.com/image.png",
  "errors" : [],
  "warnings" : [],
  "childrenObject" : []
}
```

##POST
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

>Example request
```shell
curl https://api.nicelink.xyz/jimp?background=https%3A%2F%2Fexample.com%2Fimage.png
```
> The above command returns an image or the string `Error rendering content` 

##GET
`GET https://api.nicelink.xyz/jimp`

The above listed properties can be used as parameters for `GET` requests too. But then they will need to be uriencoded properly.

<aside class="warning">
It's recommended to use the <code>POST</code> method to interact with the API, as this returns the URL in the right format and includes warnings/errors it encountered.
In the end a <code>GET</code> request will have to be made to retrieve the image though.
</aside>