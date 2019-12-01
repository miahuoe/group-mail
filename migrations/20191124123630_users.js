
const tableName = "users";

exports.up = function(knex) {
	return knex.schema.createTable(tableName, function (table) {
		table.increments("id").primary();
		table.string("login").notNull();
		table.string("email").notNull();
		table.string("password").notNull();
		table.datetime("joined").notNull().defaultTo(knex.fn.now());

		table.unique(["login"]);
		table.unique(["email"]);
	});
};

exports.down = function(knex) {
	return knex.schema.dropTableIfExists(tableName);
};

// vim:noai:ts=4:sw=4
