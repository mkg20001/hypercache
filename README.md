# Hypercache [![Build Status](https://travis-ci.org/mkg20001/hypercache.svg?branch=master)](https://travis-ci.org/mkg20001/hypercache) [![codecov](https://codecov.io/gh/mkg20001/hypercache/branch/master/graph/badge.svg)](https://codecov.io/gh/mkg20001/hypercache)

Simple but powerful caching.

Hypercache caches async db operations and gives you the abbility to get things by id or search the database completly sync and with speeds otherwise impossible.

# Why hypercache?

 - ## Fast
 - ## Zero-Dependencies
 - ## 100% Test Coverage

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
    -   `interval`: The interval to refresh in ms (default `2500`)
    -   `manual`: This will disable the `fnc` and `interval` and will expose an `update` function that is called as `update(res)`

# Events

`ready`: Emitted when the first update occurs

`update`: Emitted when an update occurs

`error`: Emitted when a function without a callback throws an error

# Methods

`getAll()`: Returns an array of all elements

`getMap(name)`: Returns the id->object map for key `name`

`getBy(id, value)`: Returns an object with `[id]==value`

`search(str)`: Searches through all keys and returns the first with `[key]==str`

# Examples

Fetch and cache data from mongoDB

```js
const cache = new Hypercache(cb => Users.find({}, cb), {
  keys: ["id", "username"]
})
cache.once("ready", () => {
  cache.getBy("username", "mkg20001") // {username: "mkg20001", id: "1234", ...}
  cache.search("1234") // {username: "mkg20001", id: "1234", ...}
})
```
