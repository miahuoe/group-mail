const { Router } = require("express");
const router = Router({ mergeParams: true });
const { create, getUsersGroups, invite,
	leave, kick, getMembers } = require("./controller");
const posts = require("../posts");
const mail = require("../mail");
const Group = require("./model");
const token = require("../../middlewares/token");
const { HTTPError, errorHandler } = require("../../lib/HTTPError");
const authMember = require("../../middlewares/authMember");

const withGroupId = async (req, res, next) => {
	req.groupId = parseInt(req.params.groupId);
	next();
};

router.get("/", token, getUsersGroups);

router.post("/", token, create);

router.post("/:groupId/leave", token, authMember, leave);

router.get("/:groupId/users", token, authMember, getMembers);

router.post("/:groupId/users", token, authMember, invite);

router.delete("/:groupId/users/:userId", token, authMember, kick);


router.use("/:groupId/posts", posts);

router.use("/:groupId/mail", withGroupId, mail);

module.exports = router;

// vim:noai:ts=4:sw=4
