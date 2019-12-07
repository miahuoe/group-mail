const Group = require("./model");
const User = require("../users/model");
const { transaction } = require('objection');

const create = async (req, res, next) => {
	const newGroup = {
		adminId: req.user.id,
		maillocal: req.body.maillocal,
		mailpass: Math.random().toString(36).substring(2, 15), // TODO
		name: req.body.name,
		description: req.body.description
	};

	try {
		// TODO transaction?
		const g = await Group.query().insert(newGroup);
		const r = await g.$relatedQuery("users").relate(req.user.id);
		delete g.adminId;
		delete g.mailpass;
		res.status(201).json(g);
	} catch (err) {
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
	}
}

const getUsersGroups = async (req, res, next) => {
	try {
		const u = await User.query().findById(req.user.id);
		const groups = await u.$relatedQuery("groups");
		for (g of groups) {
			delete g.adminId;
		}
		res.status(200).json(groups);
	} catch (err) {
		res.status(404).json({
			message: err
		});
	}
}

const invite = (req, res, next) => {

}

module.exports = {
	create, getUsersGroups, invite,
};

// vim: noai:ts=4:sw=4
