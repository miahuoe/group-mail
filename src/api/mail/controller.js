const Group = require("../groups/model");
const { getMailFromDirectory } = require("./model");
const { connect } = require("../../services/imap");
const Joi = require("joi");

// https://github.com/mscdex/node-imap

const getMail = async (req, res, next) => {
	// TODO search
	const schema = Joi.object({
		offset: Joi.number().integer().min(0).max(1000).default(0),
		limit: Joi.number().integer().min(5).max(50).default(10),
		directory: Joi.string().valid("INBOX", "Sent", "Outbox", "Spam", "Drafts"),
	});
	const v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
		directory: req.params.directory,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	try {
		//const g = await Group.query().findById(req.groupId);
		//const i = connect(g.maillocal, g.mailpass);
		const user = process.env.TEST_IMAP_USER;
		const pass = process.env.TEST_IMAP_PASS;
		const conn = await connect(user, pass)
		getMailFromDirectory(conn, v.value.directory, v.value.offset, v.value.limit).then((mail) => {
			res.status(200).json(mail);
		}).catch((e) => {
			res.status(500).json(e);
			console.log(e);
		}).finally(() => {
			conn.end();
		});
	} catch (e) {
		console.log(e);
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
	const v = schema.validate({
		limit: req.query.limit,
		offset: req.query.offset,
		directory: req.params.directory,
		messageId: req.params.messageId,
	});
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
		return;
	}
	try {
		//const g = await Group.query().findById(req.groupId);
		//const i = connect(g.maillocal, g.mailpass);
		const user = process.env.TEST_IMAP_USER;
		const pass = process.env.TEST_IMAP_PASS;
		const conn = await connect(user, pass);
		const mail = await getMailFromDirectory(conn, v.value.directory, v.value.messageId); // TODO offset, limit
		conn.end();
		res.status(200).json(mail);
	} catch (e) {
		console.log(e);
		res.status(400).json({error: e});
	}
}

module.exports = {
	getMail, getMessage
};

// vim: noai:ts=4:sw=4
