const Group = require("../groups/model");
const model = require("./model");
const { connect } = require("../../services/imap");
const Joi = require("joi");

// https://github.com/mscdex/node-imap

const loginGroup = async (groupId) => {
	// TODO
	// const g = await Group.query().findById(req.groupId);
	// g.maillocal, g.mailpass
	const user = process.env.TEST_IMAP_USER;
	const pass = process.env.TEST_IMAP_PASS;
	return connect(user, pass);
};

const addMessage = async (req, res, next) => {
	const schema = Joi.object({
		subject: Joi.string(),
		body: Joi.string(),
		recipients: Joi.array().items(Joi.string()),
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
	});
	let v = schema.validate({
		subject: req.body.title,
		body: req.body.body,
		recipients: req.body.recipients,
		directory: req.params.directory,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	if (v.directory != "Drafts") {
		res.status(400).json({
			error: "Cannot create mail there"
		});
	}
	v = v.value;
	try {
		if (v.directory != "INBOX") {
			v.directory = "[Gmail]/"+v.directory // TODO
		}
		const conn = await loginGroup(req.groupId);
		const mail = await model.addMessage(conn, v.directory, {
			subject: v.subject,
			body: v.body,
			recipients: v.recipients
			// TODO from YOU
		});
		res.status(201).json(mail);
	} catch (e) {
		res.status(500).json(e);
	}
};

const getMessages = async (req, res, next) => {
	// TODO search
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
	});
	let v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
		directory: req.params.directory,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	try {
		if (v.directory != "INBOX") {
			v.directory = "[Gmail]/"+v.directory // TODO
		}
		const conn = await loginGroup(req.groupId);
		model.getMessages(conn, v.directory, v.offset, v.limit).then((mail) => {
			res.status(200).json(mail);
		}).catch((e) => {
			res.status(500).json(e);
		}).finally(() => {
			conn.end();
		});
	} catch (e) {
		res.status(400).json({error: e});
	}
}

const getMessage = async (req, res, next) => {
	// TODO limit, offset, search
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
		messageId: Joi.number().integer(),
	});
	let v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
		directory: req.params.directory,
		messageId: req.params.messageId,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	try {
		const conn = await loginGroup(req.groupId);
		const mail = await model.getMessages(conn, v.directory, v.messageId); // TODO offset, limit
		conn.end();
		res.status(200).json(mail[0]); // TODO index?
	} catch (e) {
		res.status(400).json({error: e}); // TODO
	}
}

const deleteMessage = async (req, res, next) => {
	const schema = Joi.object({
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
		messageId: Joi.number().integer(),
	});
	let v = schema.validate({
		directory: req.params.directory,
		messageId: req.params.messageId,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	try {
		const conn = await loginGroup(req.groupId);
		await model.deleteMessage(conn, v.directory, v.messageId);
		conn.end();
		res.sendStatus(204);
	} catch (e) {
		res.status(400).json({error: e}); // TODO
	}
};

const getAttachment = async (req, res, next) => {
	const schema = Joi.object({
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
		messageId: Joi.number().integer(),
		attachmentId: Joi.number().integer(),
	});
	let v = schema.validate({
		directory: req.params.directory,
		messageId: req.params.messageId,
		attachmentId: req.params.attachmentId,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	try {
		const conn = await loginGroup(req.groupId);
		const atta = await model.getPart(conn, v.directory, v.messageId, v.attachmentId);
		conn.end();
		res.status(200).json(atta);
	} catch (e) {
		res.status(404).json({error: e});
	}
};

module.exports = {
	getMessages, getMessage, deleteMessage, addMessage, getAttachment
};

// vim: noai:ts=4:sw=4
