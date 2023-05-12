/* global bare */

const EMPTY = new Uint32Array([0, 0])

module.exports = exports = function hrtime (prev = EMPTY) {
  const result = new Uint32Array(2)
  bare.hrtime(result, prev)
  return result
}

exports.bigint = function hrtime () {
  const time = exports()
  return BigInt(time[0]) * BigInt(1e9) + BigInt(time[1])
}
