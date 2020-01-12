"use strict";
/* jshint node: true, esversion: 8, unused: true */

const { Router } = require("express");
const router = Router({ mergeParams: true });
const controller = require("./controller");
const posts = require("../posts");
const mail = require("../mail");
//const Group = require("./model");
const token = require("../../middlewares/token");
//const { HTTPError, errorHandler } = require("../../lib/HTTPError");
const authMember = require("../../middlewares/authMember");

router.get("/", token, controller.getUsersGroups);

router.post("/", token, controller.create);

router.post("/:groupId/leave", token, authMember, controller.leave);

router.get("/:groupId/users", token, authMember, controller.getMembers);

router.post("/:groupId/users", token, authMember, controller.invite);

router.delete("/:groupId/users/:userId", token, authMember, controller.kick);


router.use("/:groupId/posts", posts);

router.use("/:groupId/mail", mail);

module.exports = router;

// vim:noai:ts=4:sw=4
