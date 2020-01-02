"use strict";

const { Router } = require("express");
const router = Router({ mergeParams: true });
const { register, login } = require("./controller");
const password = require("../../middlewares/password");

router.post("/register", register);

router.post("/login", password, login);

module.exports = router;

// vim:noai:ts=4:sw=4
