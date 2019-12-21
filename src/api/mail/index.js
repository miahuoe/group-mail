const { Router } = require("express")
const router = Router()
const { getMessage, getMessages, deleteMessage, addMessage } = require("./controller")
const token = require("../../middlewares/token")

// https://github.com/mscdex/node-imap

router.get("/:directory", token, getMessages);

router.post("/:directory", token, addMessage);

router.get("/:directory/messages/:messageId", token, getMessage);

router.delete("/:directory/messages/:messageId", token, deleteMessage);


//router.post("/", token, addComment);

module.exports = router;

// vim:noai:ts=4:sw=4
