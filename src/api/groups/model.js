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

	static get relationMappings() {
		const User = require("../users/model");
		return {
			users: {
				relation: Model.ManyToManyRelation,
				modelClass: User,
				join: {
					from: "mail_groups.id",
					through: {
						from: "membership.groupId",
						to: "membership.userId"
					},
					to: "users.id"
				}
			}
		}
	};

	$beforeInsert() {
		// set date
	}
}

module.exports = Group;

// vim:noai:ts=4:sw=4
