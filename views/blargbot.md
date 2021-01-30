---
title: Nice link!
language_tabs:
  - shell : cURL
  - csharp : BBtag
includes: []
search: true
highlight_theme: darkula
headingLevel: 2
code_clipboard: true
---

<!-- Generator: Widdershins v4.0.1 -->
#Shards
##Retrieve shard info

> Example request
```shell
curl "https://api.nicelink.xyz/blargbot/shards" 
```
```csharp
{request;https://api.nicelink.xyz/blargbot/shards}
```
> The above command returns JSON structured like: 
```json
[
  {"id": 0,
    "time": 1609543687452,
    "readyTime": 1608948564348,
    "guilds": 5106,
    "rss": 2211749888,
    "cpu": 60.79999999987194,
    "shardCount": 4,
    "shards": [
      {
        "id": 0,
        "status": "ready",
        "latency": 68,
        "guilds": 1256,
        "cluster": 0,
        "time": 1609543687453
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
down | `false` | If set to true, the response will only returns clusters with disconnected shards.
guild | `null` | If provided will return an object with the `shard` and `cluster` the `guild` is in.
cluster | `null` | If provided will return a cluster object.
shard | `null` | If provided will return a shard object.

<aside class="notice">
    Using multiple parameters in one request will priorize the higher parameter and ignore the others.
</aside>

##Retrieve metadata
>Example request
```shell
curl "https://api.nicelink.xyz/blargbot/shards/meta" 
```
```csharp
{request;https://api.nicelink.xyz/blargbot/shards/meta}
```
> The above command returns a JSON structured like:
```json
{
  "shards": 32,
  "clusters": 8,
  "lastMetaUpdate": 1611771482968,
  "shardsPerCluster": 4,
  "guilds": 30816,
  "users": 2839471
}
```
This endpoint returns metadata of the shards and clusters, alongside guild and user count.
###HTTP Request
`GET https://api.nicelink.xyz/blargbot/shards/meta`
#Tags
##Retrieve tag info
> Example request
```shell
curl "https://api.nicelink.xyz/blargbot/tags?tag=zws" 
```
```csharp
{request;https://api.nicelink.xyz/blargbot/tags?tag=zws}
```
> The above command returns JSON structured like this:
```json
{
  "name": "zws",
  "category": 1,
  "description": "Will be replaced by a single zero width space (unicode 200B)",
  "staffOnly": false,
  "arguments": [
    null
  ],
  "returns": [],
  "errors": [],
  "usage": {
    "code": "{zws}",
    "input": null,
    "out": "​"
  },
  "limits": [],
  "deprecated": {
    "isDeprecated": false
  }
}
```
This endpoint retrieves the JSON objects of tags
### HTTP Request
`GET https://api.nicelink.xyz/blargbot/tags`
### Query parameters
Parameter | Default | Description
----------| ------- | ----------- 
tag | none | If provided, will return the tag object of `tag`. Otherwise returns all tags
#Errors
##Error format
>Example error
```json
{"error": "Invalid guild",
  "message" : "Error is an invalid integer, please try again"
}
```
All request will have an identical JSON structure with `error` and `message` as properties.