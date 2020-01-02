"use strict";

const { Model } = require("objection");
const knex = require("../../services/knex");

Model.knex(knex);

class Comment extends Model {

	static get tableName() {
		return "comments";
	}

	static get idColumn() {
		return "id";
	}

	static get jsonSchema() {
		return {
			type: "object",
			required: ["postId", "authorId", "body"],
			properties: {
				id: {type: "integer", readOnly: true},
				postId: {type: "integer", readOnly: true},
				authorId: {type: "integer", readOnly: true},
				body: {type: "string"},
				created: {type: "string", format: "date-time"}
			}
		}
	}

	$beforeInsert() {
		// set date
	}
}

module.exports = Comment;

// vim:noai:ts=4:sw=4
