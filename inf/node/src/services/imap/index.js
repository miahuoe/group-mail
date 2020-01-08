"use strict";

const { imapConnection } = require("../../config");
const imap = require("imap");

const connect = (user, password) => {
	return new Promise((resolve, reject) => {
		imapConnection.user = user;
		imapConnection.password = password;
		const connection = imap(imapConnection);
		resolve(connection);
	});
};

module.exports = { imap, connect };

// vim:noai:ts=4:sw=4


