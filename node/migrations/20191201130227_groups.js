"use strict";
/* jshint esversion: 8, node: true, unused: true */

const config = require("../src/config");
const tableName = "mail_groups";

exports.up = function(knex) {
	const k = knex.schema.createTable(tableName, function (table) {
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
	});
	// NOTE dovecot accepts only >500
	if (config.databaseClient === "sqlite3") {
		k.raw(`UPDATE sqlite_sequence SET seq = 10000 WHERE name = '${tableName}'`);
	} else if (config.databaseClient === "mysql") {
		k.raw(`ALTER TABLE ${tableName} AUTO_INCREMENT = 10000`);
	}
	return k;
};

exports.down = function(knex) {
	return knex.schema.dropTableIfExists(tableName);
};

// vim:noai:ts=4:sw=4
