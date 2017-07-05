"use strict"

const debug = require('debug')
const _log = debug('hypercache')
const util = require("util")

function getfncName(fnc) {
  const code = fnc.toString()
  const name = util.inspect(fnc).match(/\[Function: ([a-z0-9_-]+)\]/mi)
  const fncname = code.match(/function *([a-z0-9_-]+)\(.*\)/mi)
  const arrowargs = code.match(/[\(]{0,1}([a-z0-9_, -]+)[\)]{0,1} *=>/mi)

  return [name, fncname, arrowargs]
    .filter(e => !!e)
    .map(e => e[1].replace(/^"/g, "").replace(/"$/g, ""))[0]
}

function HyperCache(fnc, opt) {

  const self = this
  const log = function () {
    const a = [].slice.call(arguments, 0)
    a.unshift("hypercache " + name + ":")
    _log.apply(_log, a)
  }
  let firstupdate = true
  let ready = false

  if (!opt) opt = {}
  if (!opt.keys) opt.keys = []

  let cache = []
  let m = {}

  if (!opt.manual && typeof fnc != "function") throw new Error("no function given")

  let name = opt.name
  if (!name || !name.trim()) name = fnc && getfncName(fnc) ? getfncName(fnc) : "unnamed"
  name = name.trim().replace(/ /g, "_")
  let qname = JSON.stringify(name)

  function err(msg) {
    return new Error("HyperError(index=" + qname + "): " + msg)
  }

  log("initializing")

  let intv = 0
  let syncQueue //last thing that is unsynced
  let syncSkip = 0
  let callLock = false
  let callTimeout = opt.timeout || opt.interval + 1000 || 3500

  function doCall(a, b) {
    if (callLock) return
    let cbFired = false
    const rcb = b ? b : a
    let cb = (_err, res) => {
      if (cbFired) throw err("Callback called twice")
      cbFired = true
      callLock = false
      clearTimeout(tm)
      rcb(_err, res)
    }
    const tm = setTimeout(() => cb(err("Timeout")), callTimeout)
    callLock = true
    fnc(b ? a : cb, b ? cb : null)
  }

  function getBy(id, idv) {
    if (!idv) {
      idv = id
      id = opt.keys[0]
    }
    if (typeof id != "string") throw err(id + " is not of type string")
    if (opt.keys.indexOf(id) == -1) throw err(id + " is not a valid key")
    if (!m[id] || !ready) throw err("Index not ready")
    return m[id][idv]
  }

  function getMap(id) {
    if (opt.keys.indexOf(id) == -1) throw err(id + " is not a valid key")
    if (!ready) throw err("Index not ready")
    return Object.assign(m[id])
  }

  function refresh() {
    log("refreshing index", cache.length)
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
    doCall((err, res) => {
      if (err) self.emit("error", err)
      cache = res
      refresh()
    })
  }

  function syncLoad(a) {
    if (callLock) {
      if (syncQueue) syncSkip++
        syncQueue = opt.sync.getAll()
    }
    doCall(a || opt.sync.getAll(), (err, res) => {
      if (err) self.emit("error", err)
      cache = res
      refresh()
      if (syncSkip) console.error("Hypercache %s: Skipped %s sync itteration(s)", qname, syncSkip)
      if (syncQueue) {
        const q = syncQueue
        syncQueue = null
        syncSkip = 0
        syncLoad(q)
      }
    })
  }

  function update(data) {
    if (!Array.isArray(data)) throw err("Input is not an array")
    cache = data
    refresh()
    self.emit("update")
  }

  function search(val) {
    if (!ready) throw err("Index not ready")
    return opt.keys.map(map => getBy(map, val)).filter(e => !!e)
  }

  function getAll() {
    if (!ready) throw err("Index not ready")
    return cache.slice(0)
  }

  function destroy() {
    if (intv) clearInterval(intv)
    log("destroying")
    self.emit("destroy")
    ready = false
    cache = []
  }

  if (opt.sync && opt.manual) {
    throw err("Currently manual+sync is not supported")
  } else if (opt.manual) {
    this.update = update
  } else if (opt.sync) {
    if (!(opt.sync instanceof HyperCache)) throw err("opt.sync is not a hypercache")
    opt.sync.on("error", e => self.emit("error", e))
    opt.sync.on("update", syncLoad)
  } else {
    intv = setInterval(load, opt.interval || 2500)
    process.nextTick(load) //fix for events
  }

  this.getAll = getAll
  this.getMap = getMap
  this.getBy = getBy
  this.search = search
  this.destroy = destroy
}

require("util").inherits(HyperCache,
  require("events").EventEmitter)

module.exports = HyperCache
