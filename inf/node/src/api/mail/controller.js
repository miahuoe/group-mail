"use strict";

const Group = require("../groups/model");
const model = require("./model");
const { connect } = require("../../services/imap");
const Joi = require("joi");
const { HTTPError } = require("../../lib/HTTPError");

const getMessages = async (req, res, next) => {
	try {
		const schema = Joi.object({
			search: Joi.string(),
			offset: Joi.number().integer().min(0).max(1000).default(0),
			limit: Joi.number().integer().min(5).max(50).default(10),
		});
		let v = schema.validate({
			search: req.query.search,
			limit: req.query.limit,
			offset: req.query.offset,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.getMessages(conn, req.directory, v.search, v.offset, v.limit);
		res.status(200).json(mail);
	} catch (err) {
		next(err);
	}
}

const getMessage = async (req, res, next) => {
	try {
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.getMessage(conn, req.directory, req.messageId);
		if (!mail) {
			throw new HTTPError(404, "No such message");
		}
		res.status(200).json(mail);
	} catch (err) {
		next(err);
	}
}

const deleteMessage = async (req, res, next) => {
	try {
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		await model.deleteMessage(conn, req.directory, req.messageId);
		res.sendStatus(204);
	} catch (err) {
		next(err);
	}
};

const addMessage = async (req, res, next) => {
	try {
		const schema = Joi.object({
			subject: Joi.string().required(),
			body: Joi.string().required(),
			to: Joi.array().items(Joi.string()).required(),
		});
		let v = schema.validate({
			subject: req.body.subject,
			body: req.body.body,
			to: req.body.to,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.addMessage(conn, req.directory, {
			subject: v.subject,
			body: v.body,
			to: v.to,
			from: req.group.maillocal+"@mail.com",
		});
		res.status(201).json(mail);
	} catch (err) {
		next(err);
	}
};

const updateMessage = async (req, res, next) => {
	// TODO update only present fields
	try {
		const schema = Joi.object({
			subject: Joi.string().required(),
			body: Joi.string().required(),
			to: Joi.array().items(Joi.string()).required(),
		});
		let v = schema.validate({
			subject: req.body.subject,
			body: req.body.body,
			to: req.body.to,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.updateMessage(conn, req.directory, req.messageId, {
			subject: v.subject,
			body: v.body,
			to: v.to,
			from: req.group.maillocal+"@mail.com",
		});
		res.status(200).json(mail);
	} catch (err) {
		next(err);
	}
};

const getAttachment = async (req, res, next) => {
	try {
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const atta = await model.getPart(conn, req.directory, req.messageId, req.attachmentId);
		res.set("Content-Type", "application/octet-stream");
		res.status(200).end(Buffer.from(atta), "binary");
	} catch (err) {
		next(err);
	}
};

const addAttachment = async (req, res, next) => {
	try {
		if (!req.file) {
			throw new HTTPError(400, "File required");
		}
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.addAttachment(conn, req.directory, req.messageId, req.file);
		res.status(201).json(mail);
	} catch (err) {
		next(err);
	}
};

const deleteAttachment = async (req, res, next) => {
	try {
		const conn = await connect(req.group.maillocal, req.group.mailpass);
		const mail = await model.deleteAttachment(conn, req.directory, req.messageId, req.attachmentId);
		res.status(200).json(mail);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	getMessages, getMessage, deleteMessage, addMessage, updateMessage,
	getAttachment, addAttachment, deleteAttachment
};

// vim: noai:ts=4:sw=4
