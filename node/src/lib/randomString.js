"use strict";

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

module.exports = randomString;
// vim: noai:ts=4:sw=4
