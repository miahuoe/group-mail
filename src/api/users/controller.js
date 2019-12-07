const { sign } = require("../../services/jwt");
const { passwordHash } = require("../../services/bcrypt");
const { limits } = require("../../config");
const User = require("./model");
const Joi = require("joi");

const register = (req, res, next) => {
	/* TODO
	 * Maybe register should be similar to login? BasicAuth?
	 */
	const schema = Joi.object({
		login: Joi.string().alphanum()
			.min(limits.login.minLength)
			.max(limits.login.maxLength).required(),
		email: Joi.string().email({
			minDomainSegments: 2, // something.com
			tlds: { allow: ["com", "net", "pl", "edu"] } // TODO add more
		}).required(),
		password: Joi.string()
			.min(limits.password.minLength)
			.max(limits.password.maxLength).required(),
	});
	const v = schema.validate(req.body);
	if (v.error) {
		res.status(400).json({
			error: v.error
		});
		return;
	}

	const hashedPassword = passwordHash(v.value.password);
	User.query().insert({
		login: v.value.login,
		email: v.value.email,
		password: hashedPassword
	}).then((result) => {
		res.status(201).json({
			message: "Registered"
		});
	}).catch((err) => {
		if (err.code == "ER_DUP_ENTRY") { // TODO which duplicate?
			res.status(409).json({
				//error: err,
				message: "Such user exists"
			});
		} else {
			res.status(500).json({ // TODO 5xx
				message: "Other error :(",
				// TODO When does it fail exactly?
				error: err
			});
		}
	});
};

const login = (req, res, next) => {
	const token = sign(req.user);
	res.status(200).json({
		token,
		userData: {
			login: req.user.login,
			email: req.user.email,
			joined: req.user.joined,
		}
	});
};

module.exports = {
	register, login
};

// vim:noai:ts=4:sw=4
