'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/lhook.cjs.prod.js')
} else {
  module.exports = require('./dist/lhook.cjs.js')
}
