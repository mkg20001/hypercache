const uuid = require("uuid")
const gene = require("gene-rator")

let i = 0

const gen = gene({
  name: () => {
    i++
    return "user" + i
  },
  id: () => uuid()
}, {})

module.exports = function GenUsers(count) {
  return gen({}, count)
}
