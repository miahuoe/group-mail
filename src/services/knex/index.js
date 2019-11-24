const config = require("../../config");
const knex = require("knex");

module.exports = knex({
	client: config.databaseClient,
	connection: config.databaseConnection
});

// vim:noai:ts=4:sw=4
