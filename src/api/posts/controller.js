const Post = require("./model");

const addPost = async (req, res, next) => {
	// offset 0-1000,0
	// limit 5-50,10
	console.log(req); // TODO {}
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
		res.status(400).json(e);
	}
}

const getPosts = (req, res, next) => {
	req.status(200).json({post: "posts"});
}

module.exports = {
	addPost, getPosts
};

// vim: noai:ts=4:sw=4
