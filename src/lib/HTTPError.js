
class HTTPError extends Error {
	constructor(httpcode, message) {
		super(message);
		this.httpcode = httpcode;
	}
};

const errorHandler = (err, req, res, next) => {
	if (err instanceof HTTPError) {
		res.status(err.httpcode).json({error: err.message});
	} else {
		console.error(err.stack)
		res.sendStatus(500);
	}
}

module.exports = {
	HTTPError,
	errorHandler,
};

// vim:noai:ts=4:sw=4
