"use strict"

var Mongoose = require('mongoose').Mongoose
var mongoose = new Mongoose()

var Mockgoose = require('mockgoose').Mockgoose
var mockgoose = new Mockgoose(mongoose)

global.mongoose = mongoose;
["User"].forEach(i => {
  global[i] = require("./models/" + i)
  global["gen" + i] = require("./generators/" + i)
})

require("colors")

function log(_) {
  const a = [].slice.call(arguments, 0)
  a[0] = (" => " + _).grey
  console.log.apply(console, a)
}

function add(data, fnc, cb) {
  const i = data.shift()
  if (i) fnc(i, err => err ? cb(err) : add(data, fnc, cb))
  else cb()
}

const hypercache = require("..")

const sinon = require("sinon")
const chai = require("chai")
chai.use(require("sinon-chai"))
chai.should()

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

  describe("mongoose", () => {
    let cache
    let data
    before(cb => {
      log("Generating testdata...")
      data = global.genUser(100)
      log("Inserting %s user entrys to db...", data.length)
      add(data.slice(0), (data, cb) => new global.User(data).save(cb), err => {
        if (err) return cb(err)
        log("Creating hypercache...")
        cache = new hypercache(cb => global.User.find({}, cb), {
          interval: 1000
        })
        cache.on("error", cb)
        cache.on("ready", cb)
      })
    })

    it("should return an array with 100 items", () => cache.getAll().should.have.lengthOf(100))
  })
})
