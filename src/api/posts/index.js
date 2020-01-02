const { Router } = require("express");
const router = Router({ mergeParams: true });
const { addPost, getPosts } = require("./controller");
const token = require("../../middlewares/token");
const authMember = require("../../middlewares/authMember");
const comments = require("../comments");
const Post = require("./model");
const { HTTPError, errorHandler } = require("../../lib/HTTPError");

router.get("/", token, authMember, getPosts);

router.post("/", token, authMember, addPost);

router.use("/:postId/comments", async (req, res, next) => {
	// TODO validate
	try {
		const p = await Post.query().findById(parseInt(req.params.postId));
		if (!p) {
			throw new HTTPError(404, "No such post");
		}
		req.post = p;
		next();
	} catch (err) {
		errorHandler(err, req, res, next);
	}
}, comments);

module.exports = router;

// vim:noai:ts=4:sw=4
