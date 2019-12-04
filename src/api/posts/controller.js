const Post = require("./model");
const Group = require("../groups/model");

const addPost = async (req, res, next) => {
	// offset 0-1000,0
	// limit 5-50,10
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
	try {
		const g = await Group.query().findById(req.groupId);
		const p = await g.$relatedQuery("posts");
		res.status(200).json(p);
	} catch (e) {
		res.status(400).json(e); // TODO error
	}
}

module.exports = {
	addPost, getPosts
};

// vim: noai:ts=4:sw=4
