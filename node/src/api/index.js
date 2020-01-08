"use strict";

const groups = require("./groups");
const users = require("./users");
const {Router} = require("express");

const router = Router({ mergeParams: true });

router.use("/groups", groups);

router.use("/users", users);

module.exports = router;

// vim:noai:ts=4:sw=4
