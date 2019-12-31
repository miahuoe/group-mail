const { sign } = require("../../services/jwt");
const { passwordHash } = require("../../services/bcrypt");
const { limits } = require("../../config");
const User = require("./model");
const Joi = require("joi");
const HTTPError = require("../../lib/HTTPError");

const register = async (req, res, next) => {
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
	try {
		const v = schema.validate(req.body);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		const hashedPassword = passwordHash(v.value.password);
		const u = await User.query().insert({
			login: v.value.login,
			email: v.value.email,
			password: hashedPassword
		});
		res.status(201).json({ message: "Registered" });
	} catch (err) {
		if (err.code && err.code == "ER_DUP_ENTRY") {
			let message = ""
			if (err.sqlMessage.indexOf("login") != -1) {
				message = "Login occupied"
			} else if (err.sqlMessage.indexOf("email") != -1) {
				message = "Email already used"
			}
			next(new HTTPError(409, message));
		} else {
			next(err);
		}
	}
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
