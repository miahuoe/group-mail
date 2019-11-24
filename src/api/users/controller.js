const User = require('./model');

const register = async ({query, params}, res, next) => {
	console.log(query, params)
	try {
		// TODO does not work?
		const result = await User.query().insert({
			login: query.login,
			email: query.email,
			password: query.password
		});
		res.send(result).status(200);
	} catch (e) {
		res.send(e).status(403); // ??
	} finally {
		res.end();
	}
}

const login = ({query, params}, res, next) => {
	res.send("login");
}

module.exports = {
	register, login
};

// vim:noai:ts=4:sw=4
