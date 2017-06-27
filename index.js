"use strict"

const debug = require('debug')
const log = debug('hypercache')

function getfncName(code) {
  const fncname = code.match(/function *([a-z0-9_-]+)\(.*\)/mi)
  const arrowargs = code.match(/[\(]{0,1}([a-z0-9_, -]+)[\)]{0,1} *=>/mi)

  return [fncname, arrowargs]
    .filter(e => !!e)
    .map(e => e[1].replace(/^"/g, "").replace(/"$/g, ""))[0]
}

function HyperCache(fnc, opt) {

  const self = this
  let firstupdate = true
  let ready = false

  if (!opt) opt = {}
  if (!opt.keys) opt.keys = []

  let cache = []
  let m = {}

  let name = opt.name
  if (!name) name = fnc && getfncName(fnc.toString()) ? getfncName(fnc.toString()) : "unnamed"
  let qname = JSON.stringify(name)

  function getBy(id, idv) {
    if (!idv) {
      idv = id
      id = opt.keys[0]
    }
    if (typeof id != "string") throw new Error("HyperError(index=" + qname + "): " + id + " is not of type string")
    if (opt.keys.indexOf(id) == -1) throw new Error("HyperError(index=" + qname + "): " + id + " is not a valid key")
    if (!m[id] || !ready) throw new Error("HyperError(index=" + qname + "): Index not ready")
    return m[id][idv]
  }

  function getMap(id) {
    if (opt.keys.indexOf(id) == -1) throw new Error("HyperError(index=" + qname + "): " + id + " is not a valid key")
    if (!ready) throw new Error("HyperError(index=" + qname + "): Index not ready")
    return Object.assign(m[id])
  }

  function refresh() {
    log("Refreshing index for hypercache -", name)
    opt.keys.forEach(map => {
      m[map] = {}
      cache.forEach(e => {
        m[map][e[map]] = e
      })
    })

    if (firstupdate) {
      firstupdate = false
      ready = true
      self.emit("ready")
    }

    self.emit("update")
  }

  function load() {
    fnc((err, res) => {
      if (err) self.emit("error", err)
      //if (err && cb) return cb(err)
      cache = res
      refresh()
      //if (cb) cb()
    })
  }

  if (!opt.manual) {
    setInterval(load, opt.interval || 2500)
    process.nextTick(load) //fix for events
  }

  function update(data) {
    if (!Array.isArray(data)) throw new Error("HyperError(index=" + qname + "): Input is not an array")
    cache = data
    refresh()
    self.emit("update")
  }

  function search(val) {
    if (!ready) throw new Error("HyperError(index=" + qname + "): Index not ready")
    return opt.keys.map(map => getBy(map, val)).filter(e => !!e)
  }

  function getAll() {
    if (!ready) throw new Error("HyperError(index=" + qname + "): Index not ready")
    return cache.slice(0)
  }

  if (opt.manual) {
    this.update = update
  }

  this.getAll = getAll
  this.getMap = getMap
  this.getBy = getBy
  this.search = search
}

require("util").inherits(HyperCache,
  require("events").EventEmitter)

module.exports = HyperCache
