const bcrypt = require("bcrypt");
const { Model } = require("objection");
const knex = require("../../services/knex");

Model.knex(knex);

class Group extends Model {

	static get tableName() {
		return "mail_groups";
	}

	static get idColumn() {
		return "id";
	}

	static get jsonSchema() {
		return {
			type: "object",
			required: ["adminId", "emailLocal", "name", "description"],
			properties: {
				id: {type: "integer", readOnly: true},
				adminId: {type: "integer", readOnly: true},
				emailLocal: {type: "string"},
				//emailPassword: {type: "string"},
				name: {type: "string"},
				description: {type: "string"},
				created: {type: "string", format: "date-time"}
			}
		}
	}

	$beforeInsert() {
		// set date
	}
}

module.exports = Group;

// vim:noai:ts=4:sw=4
