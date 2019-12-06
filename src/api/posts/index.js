const { Router } = require("express")
const router = Router()
const { addPost, getPosts } = require("./controller")
const token = require("../../middlewares/token")
const comments = require("../comments")

router.get("/", token, getPosts);

router.post("/", token, addPost);

router.use("/:postId/comments", (req, res, next) => {
	req.postId = parseInt(req.params.postId); // TODO
	next();
}, comments);

module.exports = router;

// vim:noai:ts=4:sw=4
