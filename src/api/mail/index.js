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

const allDirs = ["INBOX", "Sent", "Spam", "Drafts"];
const onlyDrafts = ["Drafts"];

router.get("/:directory", token, authMember, allowDirectories(allDirs), getMessages);
router.post("/:directory", token, authMember, allowDirectories(onlyDrafts), addMessage);

router.get("/:directory/messages/:messageId", token, authMember, allowDirectories(allDirs), getMessage);
router.put("/:directory/messages/:messageId", token, authMember, allowDirectories(onlyDrafts), updateMessage);
router.delete("/:directory/messages/:messageId", token, authMember, allowDirectories(allDirs), deleteMessage);

router.post("/:directory/messages/:messageId/attachments", token, authMember, allowDirectories(onlyDrafts), upload.single("file"), addAttachment);

router.get("/:directory/messages/:messageId/attachments/:attachmentId", token, authMember, allowDirectories(allDirs), getAttachment);
router.delete("/:directory/messages/:messageId/attachments/:attachmentId", token, authMember, allowDirectories(onlyDrafts), deleteAttachment);

module.exports = router;

// vim:noai:ts=4:sw=4
