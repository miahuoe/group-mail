const { Model } = require("objection");
const knex = require("../../services/knex");

Model.knex(knex);

class Post extends Model {

	static get tableName() {
		return "posts";
	}

	static get idColumn() {
		return "id";
	}

	static get jsonSchema() {
		return {
			type: "object",
			required: ["author", "body"],
			properties: {
				id: {type: "integer", readOnly: true},
				author: {type: "integer", readOnly: true},
				body: {type: "string"},
				date: {type: "string", format: "date-time"}
			}
		}
	}

	$beforeInsert() {
		// set date
	}
}

module.exports = Post;

// vim:noai:ts=4:sw=4
