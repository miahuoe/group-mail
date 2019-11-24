const { Model } = require("objection");
const knex = require("../../services/knex");

Model.knex(knex);

class User extends Model {
	static get tableName() {
		return "users";
	}

	static get idColumn() {
		return "id";
	}

	static get jsonSchema() {
		return {
			type: "object",
			required: ["login", "email", "password"],
			properties: {
				id: {type: "integer", readOnly: true},
				login: {type: "string"},
				email: {type: "string"},
				password: {type: "string"},
				joined: {type: "string", format: "date-time"}
			}
		}
	}

	$beforeInsert() {
		// set date
	}
}

module.exports = User;

// vim:noai:ts=4:sw=4
