"use strict";
/* jshint esversion: 8, node: true, unused: true */

let config = {
	node: {
		env: process.env.NODE_ENV || "development",
		port: 3003,
		ip: "0.0.0.0",
		apiRoot: "/api"
	},
	databaseClient: "mysql",
	databaseConnection: {
		host: "db",
		port: "3306",
		user: "node",
		password: "node",
		database: "groupmail"
	},
	jwt: {
		expiration: "3d"
	},
	bcrypt: {
		rounds: 10
	},
	imapConnection: {
		host: "mail",
		port: "143",
		tls: false
	},
	limits: {
		login: {
			minLength: 4,
			maxLength: 20
		},
		password: {
			minLength: 8,
			maxLength: 30
		}
	}
};

if (config.node.env === "test") {
	config.databaseClient = "sqlite3";
	config.databaseConnection = {
		filename: ":memory:",
	};
}

module.exports = config;

// vim: noai:ts=4:sw=4
