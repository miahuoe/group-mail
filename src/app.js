const { node } = require("./config");
const express = require("./services/express");
const api = require("./api");
const app = express(node.apiRoot, api);
const dotenv = require("dotenv");
const HTTPError = require("./lib/HTTPError");

dotenv.config();

app.use((err, req, res, next) => {
	if (err instanceof HTTPError) {
		res.status(err.httpcode).json({error: err.message});
	} else {
		console.error(err.stack)
		res.sendStatus(500);
	}
});

app.listen(node.port, node.ip, () => {
	console.log(`listening on ${node.ip}:${node.port} in ${node.env} mode`);
});

module.exports = app;

// vim:noai:ts=4:sw=4
