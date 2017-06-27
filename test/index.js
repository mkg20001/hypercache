"use strict"

var Mongoose = require('mongoose').Mongoose
var mongoose = new Mongoose()

var Mockgoose = require('mockgoose').Mockgoose
var mockgoose = new Mockgoose(mongoose)

//mockgoose.helper.setDbVersion('3.2.1')

global.mongoose = mongoose;
["User"].forEach(i => {
  global[i] = require("./models/" + i)
  global["gen" + i] = require("./generators/" + i)
})

function add(data, fnc, cb) {
  const i = data.shift()
  if (i) fnc(i, err => err ? cb(err) : add(data, fnc, cb))
  else cb()
}

const hypercache = require("..")

const sinon = require("sinon")
const chai = require("chai")
chai.use(require("sinon-chai"))

describe("hypercache", () => {
  before(function (cb) {
    this.timeout(100 * 1000)
    console.log("Preparing storage...")
    mockgoose.prepareStorage().then(function () {
      console.log("Connecting...")
      mongoose.connect('mongodb://example.com/TestingDB', function (err) {
        cb(err)
      })
    })
  })

  describe("mongoose", () => {
    let cache
    let data
    before(cb => {
      console.log("Generating testdata...")
      data = global.genUser(100)
      console.log("Inserting %s user entrys to db...", data.length)
      add(data.slice(0), (data, cb) => new global.User(data).save(cb), err => {
        if (err) return cb(err)
        console.log("Creating hypercache...")
        cache = new hypercache(cb => global.User.find({}, cb), {
          interval: 1000
        })
        cache.on("error", cb)
        cache.on("ready", cb)
      })
    })

    it("should return an array with 100 items", () => require("assert")(cache.getAll().length, 100))
  })
})
