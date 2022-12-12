"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/event-listener.cjs.prod.js");
} else {
  module.exports = require("./dist/event-listener.cjs.js");
}
