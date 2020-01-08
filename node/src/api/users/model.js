"use strict";

const bcrypt = require("bcrypt");
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
				password: {type: "string"}, // NOTE Joi validates email
				joined: {type: "string", format: "date-time"}
			}
		}
	}

	authenticate(password) {
		return bcrypt.compare(password, this.password)
			.then((valid) => valid ? this : false);
	}

	static get relationMappings() {
		const Group = require("../groups/model");
		return {
			groups: {
				relation: Model.ManyToManyRelation,
				modelClass: Group,
				join: {
					from: "users.id",
					through: {
						from: "membership.userId",
						to: "membership.groupId"
					},
					to: "mail_groups.id"
				}
			}
		}
	};
}

module.exports = User;

// vim: noai:ts=4:sw=4
