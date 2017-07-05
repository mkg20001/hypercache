"use strict"

var Mongoose = require('mongoose').Mongoose
var mongoose = new Mongoose()

var Mockgoose = require('mockgoose').Mockgoose
var mockgoose = new Mockgoose(mongoose)

mongoose.Promise = Promise

global.mongoose = mongoose;
["User"].forEach(i => {
  global[i] = require("./models/" + i)
  global["gen" + i] = require("./generators/" + i)
})

require("colors")

function log(_) {
  const a = [].slice.call(arguments, 0)
  a[0] = (" => " + _).grey
  if (process.env.DEBUG) console.log.apply(console, a)
}

function err(a) {
  return new RegExp("^HyperError\\(index=\".*\"\\): " + a + "$", "")
}

function add(data, fnc, cb) {
  const i = data.shift()
  if (i) fnc(i, err => err ? cb(err) : add(data, fnc, cb))
  else cb()
}

const sinon = require("sinon")
const chai = require("chai")
chai.use(require("sinon-chai"))
chai.should()
const expect = chai.expect
const assert = require("assert")

const hypercache = require("..")

function createHypercache(conf, opt, cb) {
  log("Cleanup db...")
  mockgoose.helper.reset().then(() => {
    log("Generating testdata...")
    let data = global.genUser(conf.items || 10)
    let cache
    log("Inserting %s user entrys to db...", data.length)
    add(data.slice(0), (data, cb) => new global.User(data).save(cb), err => {
      if (err) return cb(err)
      log("Creating hypercache...")
      cache = new hypercache(cb => global.User.find({}, cb), opt)
      cache.testdata = data
      cb(null, cache)
    })
  })
}

describe("hypercache", () => {
  before(function (cb) {
    this.timeout(100 * 1000)
    log("Preparing storage...")
    mockgoose.prepareStorage().then(function () {
      log("Connecting...")
      mongoose.connect('mongodb://example.com/TestingDB', function (err) {
        cb(err)
      })
    })
  })

  describe("method", () => {
    let cache
    before(cb => {
      createHypercache({
        items: 100
      }, {
        interval: 1000,
        keys: ["id", "name"]
      }, (err, _cache) => {
        if (err) return cb(err)
        else {
          cache = _cache
          cache.on("ready", cb)
        }
      })
    })

    describe("getAll", () => {
      it("should return an array with 100 items", () => cache.getAll().should.have.lengthOf(100))
    })

    describe("getMap", () => {
      it("should return a map for id with 100 items", () => {
        const map = cache.getMap("id")
        assert(map, "no map returned")
        Object.keys(map).should.have.lengthOf(100)
      })

      it("should throw for invalid map", () => {
        expect(cache.getMap).to.throw(err("undefined is not a valid key"))
      })
    })

    describe("getBy", () => {
      it("should find the first object with the first id", () => {
        const l = cache.testdata[0] //what we are looking for
        const o = cache.getBy("id", l.id) //what we got
        assert(o, "no object found")
        assert.equal(typeof o, "object", "wrong type")
        o.id.should.equal(l.id)
      })

      it("should return nothing for missing id", () => {
        assert.ok(typeof cache.getBy() == "undefined", "did not return undefined")
      })

      it("should throw for non-string id", () => expect(() => cache.getBy({}, "2")).to.throw(err("\\[object Object\\] is not of type string")))

      it("should throw for non-existing index", () => expect(() => cache.getBy("alias", "23")).to.throw(err("alias is not a valid key")))
    })

    describe("search", () => {
      it("should find the first object with the first name", () => {
        const l = cache.testdata[0] //what we are looking for
        const o_ = cache.search(l.name) //what we got
        o_.should.have.lengthOf(1)
        const o = o_[0]
        assert(o, "no object found")
        assert.equal(typeof o, "object", "wrong type")
        o.id.should.equal(l.id)
      })
    })
  })

  describe("race condition", () => {
    it("should not call fnc twice if it already is running")
  })

  describe("manual method", () => {
    let cache
    before(cb => {
      createHypercache({
        items: 10
      }, {
        manual: true,
        keys: ["id", "name"]
      }, (err, _cache) => {
        if (err) return cb(err)
        else {
          cache = _cache
          cb()
        }
      })
    })

    describe("getAll", () => {
      it("should throw index not ready", () => {
        expect(cache.getAll).to.throw(err("Index not ready"))
      })
    })

    describe("getMap", () => {
      it("should throw index not ready", () => {
        expect(() => cache.getMap("id")).to.throw(err("Index not ready"))
      })
    })

    describe("getMap", () => {
      it("should throw index not ready", () => {
        expect(() => cache.getBy("id", cache.testdata[0].id)).to.throw(err("Index not ready"))
      })
    })

    describe("search", () => {
      it("should throw index not ready", () => {
        expect(() => cache.search(cache.testdata[0].id)).to.throw(err("Index not ready"))
      })
    })

    describe("update", () => {
      it("should update the index", cb => {
        cache.on("ready", cb)
        global.User.find({}, (err, res) => {
          cache.update(res)
        })
      })

      it("should create map 'id'", () => assert(cache.getMap("id"), "no such map"))

      it("should throw if input is not array", () => expect(cache.update).to.throw(err("Input is not an array")))
    })
  })

  describe("sync", () => {
    let cache
    let pcache
    before(cb => {
      createHypercache({
        items: 20
      }, {
        keys: ["id", "name"],
        interval: 100
      }, (err, _cache) => {
        if (err) return cb(err)
        else {
          pcache = _cache
          cache = new hypercache((users, cb) => {
            return cb(null, users.map(u => {
              return {
                name: u.name,
                since: 0
              }
            }))
          }, {
            keys: ["name", "since"],
            sync: pcache
          })
        }
      })
    })

    it("should initialize the cache", cb => {
      cache.on("error", cb)
      cache.on("ready", cb)
    })

    it("should call the child update with the parent cache once")

    it("should throw if both manual and sync are used", () => {
      expect(() => new hypercache(null, {
        sync: new hypercache(null, {
          manual: true
        }),
        manual: true
      })).to.throw(err("Currently manual\\+sync is not supported"))
    })

    it("should throw if opt.sync is not hypercache", () => expect(() => new hypercache(() => {}, {
      sync: true
    })).to.throw(err("opt\\.sync is not a hypercache")))
  })

  describe("empty values", () => {
    it("should not throw if opt is empty", cb => createHypercache({}, null, cb))

    it("should not throw if opt.keys is empty", cb => createHypercache({}, {
      keys: null
    }, cb))

    it("should assume name unnamed if function is undefined", () => {
      const cache = new hypercache(null, {
        manual: true
      })
      expect(cache.getAll).to.throw('HyperError(index="unnamed"): Index not ready') //name is not public, so only errors contain it
    })

    it("should assume name index1 if name is given", () => {
      const cache = new hypercache(null, {
        manual: true,
        name: "index1"
      })
      expect(cache.getAll).to.throw('HyperError(index="index1"): Index not ready') //name is not public, so only errors contain it
    })

    it("should throw if fnc is not a function", () => expect(() => new hypercache()).to.throw("no function given"))

    it("should not throw if fnc is not a function but manual is true", () => new hypercache(null, {
      manual: true
    }))
  })

  describe("events", () => {
    let cache
    before(cb => {
      createHypercache({
        items: 25
      }, {
        manual: true
      }, (err, _cache) => {
        if (err) return cb(err)
        cache = _cache
        return cb()
      })
    })

    it("should emit ready", cb => {
      cache.once("ready", cb)
      cache.update(cache.testdata)
    })

    it("should not emit ready again", cb => {
      cache.once("ready", () => cb(new Error("but it did")))
      cache.once("update", cb)
      cache.update(cache.testdata)
    })

    it("should emit update", cb => {
      cache.once("update", cb)
      cache.update(cache.testdata)
    })

    it("should emit error if cb returns error", cb => {
      const cache = new hypercache(cb => cb(new Error("Test")), {
        interval: 1000
      })
      cache.once("error", e => cb(!e ? new Error("empty error") : null))
    })
  })
})
