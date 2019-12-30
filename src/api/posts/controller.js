const Post = require("./model");
const Group = require("../groups/model");
const Joi = require("joi");
const HTTPError = require("../../lib/HTTPError");

const addPost = async (req, res, next) => {
	const newPost = {
		groupId: req.groupId,
		authorId: req.user.id,
		body: req.body.body,
	};
	try {
		const p = await Post.query().insert(newPost);
		// TODO missing creation date
		delete p.groupId;
		res.status(201).json(p);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

const getPosts = async (req, res, next) => {
	try {
		const schema = Joi.object({
			offset: Joi.number().integer().min(0).max(1000).default(0),
			limit: Joi.number().integer().min(5).max(50).default(10),
		});
		let v = schema.validate(req.query);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await Group.query().findById(req.groupId);
		if (!g) {
			throw new HTTPError(404, "No such group");
		}
		const p = await g.$relatedQuery("posts")
			.select("id", "body", "created as date", "authorId")
			.orderBy("created", "desc")
			.limit(v.limit)
			.offset(v.offset);
		for (post of p) {
			await post.$relatedQuery("author").select("id", "login", "email", "joined");
			delete post.authorId;
		}
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	addPost, getPosts
};

// vim:noai:ts=4:sw=4
