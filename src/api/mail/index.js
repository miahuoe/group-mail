const { Router } = require("express")
const router = Router()
const { getMail } = require("./controller")
const token = require("../../middlewares/token")

// https://github.com/mscdex/node-imap

router.get("/:directory", token, getMail);

//router.post("/", token, addComment);

module.exports = router;

// vim:noai:ts=4:sw=4
