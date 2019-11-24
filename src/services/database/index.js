const { databaseConnection } = require("../../config");
const mysql = require("mysql2");

function connection() {
	return mysql.createConnection(databaseConnection);
}

module.exports = { connection }

// vim:noai:ts=4:sw=4
