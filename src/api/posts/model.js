const { Model } = require("objection");
const knex = require("../../services/knex");
const User = require("../users/model");

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
			required: ["groupId", "authorId", "body"],
			properties: {
				id: {type: "integer", readOnly: true},
				groupId: {type: "integer", readOnly: true},
				authorId: {type: "integer", readOnly: true},
				body: {type: "string"},
				created: {type: "string", format: "date-time"}
			}
		}
	}

	static get relationMappings() {
		const Comment = require("../comments/model");
		return {
			comments: {
				relation: Model.HasManyRelation,
				modelClass: Comment,
				join: {
					from: "posts.id",
					to: "comments.postId"
				}
			},
			author: {
				relation: Model.HasOneRelation,
				modelClass: User,
				join: {
					from: "posts.authorId",
					to: "users.id"
				}
			}
		}
	};
}

module.exports = Post;

// vim:noai:ts=4:sw=4
