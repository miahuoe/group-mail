const Comment = require("../comments/model");
const Post = require("./model");
const Group = require("../groups/model");
const Joi = require("joi");

const addComment = async (req, res, next) => {
	//console.log(req); // TODO {}
	const newComment = {
		postId: req.postId,
		authorId: req.user.id,
		body: req.body.body,
	};
	try {
		const c = await Comment.query().insert(newComment);
		// TODO missing creation date
		res.status(200).json(c);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

const getComments = async (req, res, next) => {
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
	});
	const v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
	});
	try {
		const g = await Group.query().findById(req.groupId);
		const p = await g.$relatedQuery("posts").findById(req.postId);
		const c = await p.$relatedQuery("comments")
			.orderBy("created")
			.limit(v.value.limit)
			.offset(v.value.offset);
		res.status(200).json(c);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

module.exports = {
	addComment, getComments
};

// vim: noai:ts=4:sw=4
