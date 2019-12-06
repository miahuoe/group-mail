const Post = require("./model");
const Group = require("../groups/model");
const Joi = require("joi");

const addPost = async (req, res, next) => {
	//console.log(req); // TODO {}
	const newPost = {
		groupId: req.groupId,
		authorId: req.user.id,
		body: req.body.body,
	};
	try {
		const p = await Post.query().insert(newPost);
		// TODO missing creation date
		delete p.groupId;
		res.status(200).json(p);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

const getPosts = async (req, res, next) => {
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
	});
	const v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
	});
	// offset 0-1000,0
	// limit 5-50,10
	try {
		const g = await Group.query().findById(req.groupId);
		const p = await g.$relatedQuery("posts")
			.orderBy("created")
			.limit(v.value.limit)
			.offset(v.value.offset);
		res.status(200).json(p);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

module.exports = {
	addPost, getPosts
};

// vim: noai:ts=4:sw=4
