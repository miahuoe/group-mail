const Group = require("../api/groups/model");
const { HTTPError, errorHandler } = require("../lib/HTTPError");

const authMember = async (req, res, next) => {
	// TODO validate
	try {
		const g = await Group.query().findById(parseInt(req.params.groupId));
		if (!g) {
			throw new HTTPError(404, "No such group");
		}
		req.group = g;
		const u = await g.$relatedQuery("users").select("id").where("id", req.user.id);
		if (!u || u.length === 0 || u[0].id != req.user.id) {
			throw new HTTPError(401, "Not a member");
		}
		next();
	} catch (err) {
		errorHandler(err, req, res, next);
	}
};

module.exports = authMember;

// vim:noai:ts=4:sw=4
