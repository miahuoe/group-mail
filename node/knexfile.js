"use strict";
/* jshint esversion: 8, node: true, unused: true */

const config = require("./src/config");

module.exports = {
	test: {
		client: "sqlite3",
		connection: {
			filename: ":memory:",
		},
		useNullAsDefault: true
	},
	development: {
		client: config.databaseClient,
		connection: config.databaseConnection
	}
};

// vim:noai:ts=4:sw=4
