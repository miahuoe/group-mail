const bcrypt = require("bcrypt");
const User = require("../api/users/model");

const password = (req, res, next) => {
	if (!req.headers.authorization || req.headers.authorization.indexOf("Basic ") == -1) {
		return req.status(401).json({
			message: "Missing BasicAuth header"
		}).end();
	}
	const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
	const [login, password] = Buffer.from(b64auth, "base64").toString("ascii").split(":");
	User.query().findOne({ login }).then((user) => {
		if (!user) {
			return res.status(401).end(); // NOTE 404 would suggest that user exists
		}
		return user.authenticate(password).then((user) => {
			if (!user) {
				return res.status(401).end();
			}
			req.user = user;
			next();
		});
	});
}

module.exports = password;

// vim:noai:ts=4:sw=4
