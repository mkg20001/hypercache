const uuid = require("uuid")
const gene = require("gene-rator")

let i = 0
let c = 0

const gen = gene({
  name: () => {
    i++
    return "user" + i
  },
  id: () => uuid(),
  count: () => {
    c++
    c = c % 6 || 1
    return c
  }
}, {})

module.exports = function GenUsers(count) {
  return gen({}, count)
}
