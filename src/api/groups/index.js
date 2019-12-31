const { Router } = require("express")
const router = Router({ mergeParams: true });
const { create, getUsersGroups, invite, leave, kick, getMembers } = require("./controller")
const posts = require("../posts")
const mail = require("../mail")
const token = require("../../middlewares/token")

const withGroupId = (req, res, next) => {
	// TODO maybe https://expressjs.com/en/4x/api.html#express.router
	req.groupId = parseInt(req.params.groupId);
	next();
};

router.get("/", token, getUsersGroups);

router.post("/", token, create);

router.post("/:groupId/users", token, invite);

router.post("/:groupId/leave", token, leave);

router.delete("/:groupId/users/:userId", token, kick);

router.get("/:groupId/users", token, getMembers);


router.use("/:groupId/posts", withGroupId, posts);

router.use("/:groupId/mail", withGroupId, mail);

module.exports = router;

// vim:noai:ts=4:sw=4
