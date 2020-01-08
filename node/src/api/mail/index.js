"use strict";

const { Router } = require("express");
const router = Router({ mergeParams: true });
const { getMessage, getMessages, deleteMessage, addMessage, updateMessage,
	getAttachment, addAttachment, deleteAttachment } = require("./controller");
const token = require("../../middlewares/token");
const upload = require("../../middlewares/multer");
const authMember = require("../../middlewares/authMember");
const Joi = require("joi");
const { HTTPError, errorHandler } = require("../../lib/HTTPError");

const allowDirectories = (dirs) => {
	return (req, res, next) => {
		try {
			const schema = Joi.object({
				directory: Joi.string().valid(...dirs).required(),
			});
			const v = schema.validate({
				directory: req.params.directory,
			});
			if (v.error) {
				throw new HTTPError(400, v.error.details[0].message);
			}
			req.directory = v.value.directory;
			next();
		} catch (err) {
			errorHandler(err, req, res, next);
		}
	};
};

const withMessageId = (req, res, next) => {
	try {
		const schema = Joi.number().integer().min(1).required();
		let v = schema.validate(req.params.messageId);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		req.messageId = v.value;
		next();
	} catch (err) {
		errorHandler(err, req, res, next);
	}
};

const withAttachmentId = (req, res, next) => {
	try {
		const schema = Joi.number().integer().min(1).required();
		let v = schema.validate(req.params.attachmentId);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		req.attachmentId = v.value;
		next();
	} catch (err) {
		errorHandler(err, req, res, next);
	}
};

const allDirs = ["INBOX", "Sent", "Spam", "Drafts"];
const onlyDrafts = ["Drafts"];

router.get("/:directory", token, authMember, allowDirectories(allDirs), getMessages);
router.post("/:directory", token, authMember, allowDirectories(onlyDrafts), addMessage);

router.get("/:directory/messages/:messageId", token, authMember, allowDirectories(allDirs), withMessageId, getMessage);
router.put("/:directory/messages/:messageId", token, authMember, allowDirectories(onlyDrafts), withMessageId, updateMessage);
router.delete("/:directory/messages/:messageId", token, authMember, allowDirectories(allDirs), withMessageId, deleteMessage);

router.post("/:directory/messages/:messageId/attachments", token, authMember, allowDirectories(onlyDrafts), withMessageId, upload.single("file"), addAttachment);

router.get("/:directory/messages/:messageId/attachments/:attachmentId", token, authMember, allowDirectories(allDirs), withMessageId, withAttachmentId, getAttachment);
router.delete("/:directory/messages/:messageId/attachments/:attachmentId", token, authMember, allowDirectories(onlyDrafts), withMessageId, withAttachmentId, deleteAttachment);

module.exports = router;

// vim:noai:ts=4:sw=4
