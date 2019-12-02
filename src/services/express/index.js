const express = require("express");

const expressConfig = (apiRoot, routes) => {
	const app = express();

	app.use(express.json());
	app.use(apiRoot, routes);

	app.use((req, res, next) => res.status(404).send({error: 'Routing not found'}));

	return app;
};

module.exports = expressConfig;

// vim: noai:ts=4:sw=4
