"use strict";

const config = require("./src/config");

module.exports = {
  development: {
    client: config.databaseClient,
    connection: config.databaseConnection
  }
};

// vim:noai:ts=4:sw=4
