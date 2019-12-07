const Group = require("./model");
const User = require("../users/model");
const Joi = require("joi");

//const { transaction } = require("objection");

const generatePassword = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const create = async (req, res, next) => {
	const schema = Joi.object({
		maillocal: Joi.string().alphanum().min(4).max(20).required(),
		name: Joi.string().alphanum().min(10).max(50).required(),
	});
	const v = schema.validate(req.body);
	if (v.error) {
		res.status(400).json({error: v.error});
		return;
	}
	const newGroup = {
		adminId: req.user.id,
		maillocal: v.value.maillocal,
		mailpass: generatePassword(),
		name: v.value.name,
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
			if (err.sqlMessage.indexOf("maillocal") != -1) {
				message = "Mail occupied"
			} else if (err.sqlMessage.indexOf("name") != -1) {
				message = "Name occupied"
			}
			res.status(409).json({message});
		} else {
			res.status(500).json({
				message: "Other error :(",
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

// vim:noai:ts=4:sw=4
