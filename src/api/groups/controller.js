const Group = require('./model');

const create = (req, res, next) => {
	Group.query().insert({
		adminId: req.user.id,
		emailLocal: req.body.emailLocal,
		name: req.body.name,
		description: req.body.description
	}).then((result) => {
		delete result.adminId;
		// TODO membership
		res.status(201).json(result);
	}).catch((err) => {
		if (err.code == "ER_DUP_ENTRY") {
			let message = ""
			if (err.sqlMessage.indexOf("mail_groups_emaillocal") != -1) {
				message = "Mail occupied"
			} else if (err.sqlMessage.indexOf("mail_groups_name") != -1) {
				message = "Name occupied"
			} else {
				// TODO
			}
			res.status(409).json({
				//error: err,
				message: message
			});
		} else {
			res.status(500).json({ // TODO 5xx
				message: "Other error :(",
				// TODO When does it fail exactly?
				error: err
			});
		}
	});
}

const getUsersGroups = (req, res, next) => {

}

const invite = (req, res, next) => {

}

module.exports = {
	create, getUsersGroups, invite,
};

// vim: noai:ts=4:sw=4
