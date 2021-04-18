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

##POST
`POST https://api.nicelink.xyz/jimp`

###Supported body properties
| Property  | Default                                       | Description      |
|-----------|-----------------------------------------------|------------------|
| background | https://api.nicelink.xyz/jimp/transparent.png | Background url to use for the image.|




##GET
`GET https://api.nicelink.xyz/jimp`

It's recommended to use the `POST` method to interact with the API, as this returns the URL in the right format and includes warnings/errors it encountered.