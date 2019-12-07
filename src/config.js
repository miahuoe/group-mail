
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
	},
	imapConnection: {
		//host: "mail",
		//port: "143",
		//tls: false
		host: "imap.gmail.com",
		port: 993,
		tls: true,
		tlsOptions: {
			servername: "imap.gmail.com"
		},
	},
	limits: {
		login: {
			minLength: 4,
			maxLength: 20
		},
		password: {
			minLength: 8,
			maxLength: 30
		}
	}
};

module.exports = config;

// vim: noai:ts=4:sw=4
