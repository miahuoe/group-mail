
const config = {
	node: {
		env: process.env.NODE_ENV || "development",
		port: 3003,
		ip: "0.0.0.0",
		apiRoot: "/api"
	},
	databaseClient: "mysql",
	databaseConnection: {
		host: "db",
		port: "3306",
		user: "node",
		password: "node",
		database: "groupmail"
	},
	jwt: {
		expiration: "3d"
	},
	bcrypt: {
		rounds: 10
	}
};

module.exports = config;

// vim: noai:ts=4:sw=4
