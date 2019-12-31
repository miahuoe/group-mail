const Group = require("../groups/model");
const model = require("./model");
const { connect } = require("../../services/imap");
const Joi = require("joi");
const HTTPError = require("../../lib/HTTPError");

// TODO need to await the whole thing?
const getGroup = async (gid) => {
	const g = await Group.query().findById(gid);
	if (!g) {
		throw new HTTPError(404, "No such group");
	}
	return g;
};

const getMessages = async (req, res, next) => {
	try {
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
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		const mail = await model.getMessages(conn, v.directory, v.search, v.offset, v.limit);
		conn.end();
		res.status(200).json(mail);
	} catch (err) {
		next(err);
	}
}

const getMessage = async (req, res, next) => {
	throw new Error(501, "Not implemented");
	try {
		const schema = Joi.object({
			directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
			messageId: Joi.number().integer().required(),
		});
		let v = schema.validate({
			directory: req.params.directory,
			messageId: req.params.messageId,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		//const mail = await model.getMessages(conn, v.directory, v.messageId);
		if (!mail || mail.length == 0) {
			throw new HTTPError(404, "No such message");
		}
		res.status(200).json(mail[0]);
		conn.end();
	} catch (err) {
		next(err);
	}
}

const deleteMessage = async (req, res, next) => {
	try {
		const schema = Joi.object({
			directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
			messageId: Joi.number().integer().required(),
		});
		let v = schema.validate({
			directory: req.params.directory,
			messageId: req.params.messageId,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		await model.deleteMessage(conn, v.directory, v.messageId);
		conn.end();
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
			directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
		});
		let v = schema.validate({
			subject: req.body.subject,
			body: req.body.body,
			to: req.body.to,
			directory: req.params.directory,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		if (v.directory != "Drafts") {
			throw new HTTPError(400, "Cannot create mail there");
		}
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		const mail = await model.addMessage(conn, v.directory, {
			subject: v.subject,
			body: v.body,
			to: v.to,
			from: g.maillocal+"@mail.com",
		}, []);
		res.status(201).json(mail);
	} catch (err) {
		next(err);
	}
};

const updateMessage = async (req, res, next) => {
	try {
		throw new HTTPError(501, "Not Implemented");
	} catch (err) {
		next(err);
	}
};

const getAttachment = async (req, res, next) => {
	try {
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
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		const atta = await model.getPart(conn, v.directory, v.messageId, v.attachmentId);
		conn.end();
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
		const schema = Joi.object({
			directory: Joi.string().valid("INBOX", "Sent", "Spam", "Drafts").required(),
			messageId: Joi.number().integer().required(),
		});
		let v = schema.validate({
			directory: req.params.directory,
			messageId: req.params.messageId,
		});
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		await model.addAttachment(conn, v.directory, v.messageId, req.file);
		conn.end();
		res.sendStatus(201);
	} catch (err) {
		next(err);
	}
};

const deleteAttachment = async (req, res, next) => {
	try {
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
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = getGroup(req.groupId);
		const conn = await connect(g.maillocal, g.mailpass);
		await model.deleteAttachment(conn, v.directory, v.messageId, v.attachmentId);
		conn.end();
		res.sendStatus(204);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	getMessages, getMessage, deleteMessage, addMessage, updateMessage,
	getAttachment, addAttachment, deleteAttachment
};

// vim: noai:ts=4:sw=4
