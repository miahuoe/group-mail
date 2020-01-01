const Post = require("../posts/model");
const Comment = require("../comments/model");
const Group = require("../groups/model");
const Joi = require("joi");
const { HTTPError } = require("../../lib/HTTPError");

const belongsToGroup = async (uid, gid) => {
	const g = await Group.query().findById(gid);
	if (!g) {
		throw new HTTPError(404, "No such group");
	}
	return g.$relatedQuery("users").select("id").where("id", uid);
};

const addComment = async (req, res, next) => {
	try {
		const u = await belongsToGroup(req.user.id, req.groupId);
		if (!u) {
			throw new HTTPError(401, "Not in group");
		}
		const p = await Post.query().findById(req.postId);
		if (!p) {
			throw new HTTPError(404, "No such post");
		}
		const schema = Joi.object({
			body: Joi.string().required(),
		});
		let v = schema.validate(req.body);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const newComment = {
			postId: req.postId,
			authorId: req.user.id,
			body: v.body,
		};
		const c = await Comment.query().insert(newComment);
		// TODO missing creation date
		res.status(201).json(c);
	} catch (err) {
		next(err);
	}
}

const getComments = async (req, res, next) => {
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
	});
	let v = schema.validate(req.query);
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	try {
		const g = await Group.query().findById(req.groupId);
		if (!g) throw new HTTPError(404, "No such group");
		const p = await g.$relatedQuery("posts").findById(req.postId);
		if (!p) throw new HTTPError(404, "No such post");
		const c = await p.$relatedQuery("comments")
			.orderBy("id", "desc")
			.orderBy("created", "desc")
			.limit(v.limit)
			.offset(v.offset);
		res.status(200).json(c);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	addComment, getComments
};

// vim: noai:ts=4:sw=4
