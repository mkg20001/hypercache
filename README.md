# Hypercache [![Build Status](https://travis-ci.org/mkg20001/hypercache.svg?branch=master)](https://travis-ci.org/mkg20001/hypercache) [![codecov](https://codecov.io/gh/mkg20001/hypercache/branch/master/graph/badge.svg)](https://codecov.io/gh/mkg20001/hypercache)

[![Greenkeeper badge](https://badges.greenkeeper.io/mkg20001/hypercache.svg)](https://greenkeeper.io/)

Simple but powerful caching.

Hypercache caches async db operations and gives you the abbility to get things by id or search the database completly sync and with speeds otherwise impossible.

# Why hypercache?

-   ## Fast
-   ## Zero-Dependencies
-   ## 100% Test Coverage

# Usage

`new Hypercache(fnc, options)`

-   `fnc`: A function that is called as `fnc(cb)`
    -   `cb(err, res)`
    -   `err`: The error that occured, if any
    -   `res`: An array of objects
-   `options`
    -   `name`: An optional name.
        If not provided the name will be guessed based on the function
    -   `keys`: A list of unique properties like `["id"]`
    -    `sets`: A list of non-unique (also array) properties like `["aliases"]`
    -   `interval`: The interval to refresh in ms (default `2500`)
    -   `manual`: This will disable the `fnc` and `interval` and will expose an `update` function that is called as `update(res)`
    -   `sync`: A hypercache to sync with. This will override the call for fnc to `fnc(opt.sync.getAll(), cb)` and disable the interval.

# Events

`ready`: Emitted when the first update occurs

`update`: Emitted when an update occurs

`error`: Emitted when a function without a callback throws an error

# Methods

`getAll()`: Returns an array of all elements

`getMap(name)`: Returns the id->object map for key `name`

`getBy(id, value)`: Returns an object with `[id]==value`

`getSetMap(name)`: Returns the id->set map for key `name`

`getSet(id, value)`: Returns an array with `[id]==value || [id].indexOf(value)`

`search(str)`: Searches through all keys and returns the first with `[key]==str`

`searchSets(str)`: Seracher through all sets and returns the first with `[key]==value || [key].indexOf(value)`

# Examples

Fetch and cache data from mongoDB

```js
const cache = new Hypercache(cb => Users.find({}, cb), {
  keys: ["id", "username"],
  sets: ["aliases"]
})
cache.once("ready", () => {
  cache.getBy("username", "mkg20001") // {username: "mkg20001", id: "1234", aliases: ["mkg", "krüger"], ...}
  cache.search("1234") // {username: "mkg20001", id: "1234", aliases: ["mkg", "krüger"], ...}
  cache.searchSets("mkg") // {username: "mkg20001", id: "1234", aliases: ["mkg", "krüger"], ...}
})
```
