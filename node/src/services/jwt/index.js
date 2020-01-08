"use strict";

const jwt = require("jsonwebtoken");
const config = require("../../config")

const sign = (user) => {
    const options = {
        expiresIn: config.jwt.expiration
    };

    return jwt.sign({
        id: user.id
    }, process.env.JWT_SECRET, options);
};

module.exports = { sign };

// vim:noai:ts=4:sw=4
