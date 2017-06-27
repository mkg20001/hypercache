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
      cache.on("error", cb)
      cache.on("ready", () => cb(null, cache))
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
          return cb()
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
        expect(cache.getMap).to.throw(/HyperError\(index=".*"\): undefined is not a valid key/)
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
    })
  })
})
