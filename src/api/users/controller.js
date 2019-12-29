const { sign } = require("../../services/jwt");
const { passwordHash } = require("../../services/bcrypt");
const { limits } = require("../../config");
const User = require("./model");
const Joi = require("joi");

const register = (req, res, next) => {
	/* TODO Maybe register should be similar to login? BasicAuth? */
	const schema = Joi.object({
		login: Joi.string().alphanum()
			.min(limits.login.minLength)
			.max(limits.login.maxLength).required(),
		email: Joi.string().email({
			minDomainSegments: 2, // something.com
			tlds: { allow: ["com"] }
		}).required(),
		password: Joi.string()
			.min(limits.password.minLength)
			.max(limits.password.maxLength).required(),
	});
	const v = schema.validate(req.body);
	if (v.error) {
		res.status(400).json({error: v.error.details[0].message});
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
		if (err.code == "ER_DUP_ENTRY") {
			let message = ""
			if (err.sqlMessage.indexOf("login") != -1) {
				message = "Login occupied"
			} else if (err.sqlMessage.indexOf("email") != -1) {
				message = "Email already used"
			}
			res.status(409).json({error: message});
		} else {
			console.error(err);
			res.status(500).json({
				error: "Other error :(",
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
