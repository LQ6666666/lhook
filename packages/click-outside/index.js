"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/click-outside.cjs.prod.js");
} else {
  module.exports = require("./dist/click-outside.cjs.js");
}
