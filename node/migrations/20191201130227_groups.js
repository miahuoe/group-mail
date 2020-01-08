
const tableName = "mail_groups";

exports.up = function(knex) {
	return knex.schema.createTable(tableName, function (table) {
		table.increments("id").primary();
		table.integer("adminId").unsigned().references("users.id").notNull();
		table.string("name").notNull();
		table.string("description").notNull();
		table.datetime("created").notNull().defaultTo(knex.fn.now());

		table.string("maillocal").notNull();
		table.string("mailpass").notNull();
		table.string("mailpassmd5").notNull();

		table.unique(["maillocal"]);
		table.unique(["name"]);
	}).raw(`ALTER TABLE ${tableName} AUTO_INCREMENT = 10000`); // NOTE dovecot accepts only >500
};

exports.down = function(knex) {
	return knex.schema.dropTableIfExists(tableName);
};

// vim:noai:ts=4:sw=4
