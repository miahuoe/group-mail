const bcrypt = require("bcrypt");
const { sign } = require("../../services/jwt");
const { passwordHash } = require("../../services/bcrypt");
const User = require("./model");

const register = (req, res, next) => {
	/* TODO
	 * Maybe register should be similar to login? BasicAuth?
	 */
	if (req.body.login == undefined
		|| req.body.email === undefined
		|| req.body.password === undefined) {
		res.status(400).end();
		return;
	} // TODO
	const hashedPassword = passwordHash(req.body.password);
	User.query().insert({
		login: req.body.login,
		email: req.body.email,
		password: hashedPassword
	}).then((result) => {
		res.status(201).json({
			message: "Registered"
		}).end();
	}).catch((err) => {
		if (err.code == "ER_DUP_ENTRY") {
			res.status(409).json({
				error: err,
				message: "Such user exists"
			}).end();
		} else {
			res.status(500).json({ // TODO 5xx
				message: "Other error :(",
				// TODO When does it fail exactly?
				error: err
			}).end();
		}
	});
};

const login = (req /*{query, params}*/, res, next) => {
	const token = sign(req.user);
	res.status(200).json({
		token,
		userData: {
			login: req.user.login,
			email: req.user.email,
			joined: req.user.joined,
		}
	}).end();
};

module.exports = {
	register, login
};

// vim:noai:ts=4:sw=4
