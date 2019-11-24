const { node } = require("./config");
const express = require("./services/express");
const api = require("./api");
const app = express(node.apiRoot, api);
const dotenv = require("dotenv");

dotenv.config();

app.listen(node.port, node.ip, () => {
	console.log(`listening on ${node.ip}:${node.port} in ${node.env} mode`);
});

module.exports = app;

// vim:noai:ts=4:sw=4
