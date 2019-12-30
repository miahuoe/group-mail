class HTTPError extends Error {
	constructor(httpcode, message) {
		super(message);
		this.httpcode = httpcode;
	}
};

module.exports = HTTPError;

// vim:noai:ts=4:sw=4
