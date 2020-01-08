"use strict";

const Post = require("./model");
const User = require("../users/model");
//const Group = require("../groups/model");
const Joi = require("joi");
const { HTTPError } = require("../../lib/HTTPError");

const addPost = async (req, res, next) => {
	try {
		const schema = Joi.object({
			body: Joi.string().required(),
		});
		let v = schema.validate(req.body);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const newPost = {
			groupId: req.group.id,
			authorId: req.user.id,
			body: v.body,
		};
		const p = await Post.query().insert(newPost);
		// TODO missing creation date
		delete p.groupId;
		res.status(201).json(p);
	} catch (err) {
		next(err);
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
		const p = await req.group.$relatedQuery("posts")
			.select("id", "body", "created as date", "authorId")
			.orderBy("id", "desc")
			.orderBy("created", "desc")
			.limit(v.limit)
			.offset(v.offset);
		for (let post of p) {
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
