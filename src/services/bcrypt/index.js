const bcrypt = require("bcrypt");
const config = require("../../config");

const passwordHash = (password) => {
	return bcrypt.hashSync(password, config.bcrypt.rounds);
};

module.exports = {
	passwordHash
};

// vim:noai:ts=4:sw=4
