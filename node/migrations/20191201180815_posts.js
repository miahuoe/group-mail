
const tableName = "posts";

exports.up = function(knex) {
	return knex.schema.createTable(tableName, function (table) {
		table.increments("id").primary();
		table.integer("groupId").unsigned().references("mail_groups.id").notNull();
		table.integer("authorId").unsigned().references("users.id").notNull();
		table.string("body").notNull();
		table.datetime("created").notNull().defaultTo(knex.fn.now());
	});
};

exports.down = function(knex) {
	return knex.schema.dropTableIfExists(tableName);
};

// vim:noai:ts=4:sw=4
