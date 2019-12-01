const Post = require("./model");

const addPost = (req, res, next) => {
	// offset 0-1000,0
	// limit 5-50,10
	req.status(200).json({post: "post"});
}

const getPosts = (req, res, next) => {
	req.status(200).json({post: "posts"});
}

module.exports = {
	addPost, getPosts
};

// vim: noai:ts=4:sw=4
