const { imapConnection } = require("../../config");
const imap = require("imap");

const connect = (user, password) => {
	imapConnection.user = user;
	imapConnection.password = password;
	return new imap(imapConnection);
};

module.exports = { imap, connect };

// vim:noai:ts=4:sw=4


