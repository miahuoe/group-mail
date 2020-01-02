"use strict";

const { Router } = require("express");
const router = Router({ mergeParams: true });
const { addComment, getComments } = require("./controller");
const token = require("../../middlewares/token");

router.get("/", token, getComments);

router.post("/", token, addComment);

module.exports = router;

// vim:noai:ts=4:sw=4
