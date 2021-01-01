---
title: Nice link!
language_tabs:
  - shell
includes: []
search: true
highlight_theme: darkula
headingLevel: 2
code_clipboard: true
---

<!-- Generator: Widdershins v4.0.1 -->
#Blargbot

##Shards

```shell
curl "https://api.nicelink.xyz/blargbot/shards" 
```
> The above command returns JSON structured like this: 

```json
[
  {
    "id" : 0,
    "shards" : [
      { 
        "id" : 0
      },
      {
        ...
      }
    ]
  },
  {
    ...
  }
]
```

This endpoint retrieves the data of the shards
### HTTP Request

`GET https://api.nicelink.xyz/blargbot/shards`

### Query parameters

Parameter | Default | Description
----------| ------- | ----------- 
down | false | If set to true, the response will only returns clusters with disconnected shards.

##Tags

```shell
curl "https://api.nicelink.xyz/blargbot/tags" 
```

This endpoint retrieves the JSON objects of tags

### HTTP Request

`GET https://api.nicelink.xyz/blargbot/tags`
### Query parameters

Parameter | Default | Description
----------| ------- | ----------- 
tag | none | If provided, will return the tag object of `tag`. Otherwise returns all tags