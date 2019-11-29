const jwt = require("jsonwebtoken");
const config = require("../config");

const authToken = (req, res, next) => {
	try {
		const token = req.headers.authorisation.split(" ")[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET, {
			maxAge: config.jwt.expiration
		});
		req.user = {
			id: decoded.id
		};
		next();
	} catch (e) {
		res.sendStatus(401);
	}
};

module.exports = authToken;

// vim:noai:ts=4:sw=4
