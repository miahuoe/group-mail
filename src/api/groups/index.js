const { Router } = require("express")
const router = Router()
const { create, getUsersGroups, invite } = require("./controller")
const posts = require("../posts")
const mail = require("../mail")
const token = require("../../middlewares/token")

router.get("/", token, getUsersGroups);

router.post("/", token, create);

//router.get("/:userId/invite", token, invite);

// TODO maybe https://expressjs.com/en/4x/api.html#express.router
router.use("/:groupId/posts", (req, res, next) => {
	req.groupId = parseInt(req.params.groupId); // TODO
	next();
}, posts);

router.use("/:groupId/mail", (req, res, next) => {
	req.groupId = parseInt(req.params.groupId); // TODO
	next();
}, mail);

module.exports = router;

// vim:noai:ts=4:sw=4
