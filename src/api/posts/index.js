"use strict";

const { Router } = require("express");
const router = Router({ mergeParams: true });
const { addPost, getPosts } = require("./controller");
const token = require("../../middlewares/token");
const authMember = require("../../middlewares/authMember");
const comments = require("../comments");
const Post = require("./model");
const { HTTPError, errorHandler } = require("../../lib/HTTPError");
const Joi = require("joi");

router.get("/", token, authMember, getPosts);

router.post("/", token, authMember, addPost);

router.use("/:postId/comments", async (req, res, next) => {
	try {
		const schema = Joi.object({
			postId: Joi.number().integer().required(),
		});
		const v = schema.validate({
			postId: req.params.postId,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		const p = await Post.query().findById(v.value.postId);
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
