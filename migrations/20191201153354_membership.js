
const tableName = "membership";

exports.up = function(knex) {
	return knex.schema.createTable(tableName, function (table) {
		table.integer("userId").unsigned().references("users.id").notNull();
		table.integer("groupId").unsigned().references("mail_groups.id").notNull();
		table.unique(["userId", "groupId"]);
	});
};

exports.down = function(knex) {
	return knex.schema.dropTableIfExists(tableName);
};

// vim:noai:ts=4:sw=4
