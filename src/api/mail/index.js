const { Router } = require("express");
const router = Router();
const { getMessage, getMessages, deleteMessage, addMessage, updateMessage,
	getAttachment, addAttachment, deleteAttachment } = require("./controller");
const token = require("../../middlewares/token");
const upload = require("../../middlewares/multer");

// https://github.com/mscdex/node-imap

router.get("/:directory", token, getMessages);
router.post("/:directory", token, addMessage);

router.get("/:directory/messages/:messageId", token, getMessage);
router.put("/:directory/messages/:messageId", token, updateMessage);
router.delete("/:directory/messages/:messageId", token, deleteMessage);

router.post("/:directory/messages/:messageId/attachments", token, upload.single("file"), addAttachment);

router.get("/:directory/messages/:messageId/attachments/:attachmentId", token, getAttachment);
router.delete("/:directory/messages/:messageId/attachments/:attachmentId", token, deleteAttachment);

module.exports = router;

// vim:noai:ts=4:sw=4
