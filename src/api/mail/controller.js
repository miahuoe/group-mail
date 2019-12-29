const Group = require("../groups/model");
const model = require("./model");
const { connect } = require("../../services/imap");
const Joi = require("joi");

const loginGroup = async (groupId) => {
	const g = await Group.query().findById(groupId);
	if (!g) throw "g404";
	return connect(g.maillocal, g.mailpass);
};

const getMessages = async (req, res, next) => {
	const schema = Joi.object({
		search: Joi.string(),
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
		directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
	});
	let v = schema.validate({
		search: req.query.search,
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
		const conn = await loginGroup(req.groupId);
		if (v.search) {
			res.sendStatus(501);
			// TODO search
			return;
		} else {
			const mail = await model.getMessages(conn, v.directory, v.offset, v.limit);
			conn.end();
			res.status(200).json(mail);
		}
	} catch (e) {
		res.status(400).json({error: e});
	}
}

const getMessage = async (req, res, next) => {
	const schema = Joi.object({
		directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
		messageId: Joi.number().integer().required(),
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
		const mail = await model.getMessages(conn, v.directory, v.messageId);
		if (!mail || mail.length == 0) {
			throw "m404";
		}
		res.status(200).json(mail[0]);
		conn.end();
	} catch (e) {
		if (e === "m404") {
			res.status(404).json({error: "No such message"});
		} else {
			res.status(500).json({error: e}); // TODO
		}
	}
}

const deleteMessage = async (req, res, next) => {
	const schema = Joi.object({
		directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
		messageId: Joi.number().integer().required(),
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

const addMessage = async (req, res, next) => {
	const schema = Joi.object({
		subject: Joi.string().required(),
		body: Joi.string().required(),
		recipients: Joi.array().items(Joi.string()).required(),
		directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
	});
	let v = schema.validate({
		subject: req.body.subject,
		body: req.body.body,
		recipients: req.body.recipients,
		directory: req.params.directory,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	v = v.value;
	if (v.directory != "Drafts") {
		res.status(400).json({
			error: "Cannot create mail there"
		});
		return;
	}
	try {
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

const updateMessage = async (req, res, next) => {
	res.sendStatus(501);
};

const getAttachment = async (req, res, next) => {
	// TODO base64
	const schema = Joi.object({
		directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
		messageId: Joi.number().integer().required(),
		attachmentId: Joi.number().integer().required(),
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

const addAttachment = async (req, res, next) => {
	res.sendStatus(501);
};

const deleteAttachment = async (req, res, next) => {
	res.sendStatus(501);
};

module.exports = {
	getMessages, getMessage, deleteMessage, addMessage, updateMessage,
	getAttachment, addAttachment, deleteAttachment
};

// vim: noai:ts=4:sw=4
