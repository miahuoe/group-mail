const Group = require("./model");
const User = require("../users/model");
const Joi = require("joi");
const md5 = require("md5");
const HTTPError = require("../../lib/HTTPError");

//const { transaction } = require("objection");

const getGroup = async (gid) => {
	const g = await Group.query().findById(gid);
	if (!g) {
		throw new HTTPError(404, "No such group");
	}
	return g;
};

const getUser = async (uid) => {
	const u = await User.query().findById(uid);
	if (!u) {
		throw new HTTPError(404, "No such user");
	}
	return u;
};

const generatePassword = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const create = async (req, res, next) => {
	const schema = Joi.object({
		description: Joi.string(),
		maillocal: Joi.string().alphanum().min(4).max(20).required(),
		name: Joi.string().alphanum().min(10).max(50).required(),
	});
	try {
		let v = schema.validate(req.body);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const password = generatePassword();
		const newGroup = {
			adminId: req.user.id,
			maillocal: v.maillocal,
			mailpass: password,
			mailpassmd5: md5(password),
			name: v.name,
			description: v.description
		};
		// TODO transaction?
		const g = await Group.query().insert(newGroup);
		const r = await g.$relatedQuery("users").relate(req.user.id);
		delete g.adminId;
		delete g.mailpass;
		delete g.mailpassmd5;
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
			next(err);
		}
	}
};

const getUsersGroups = async (req, res, next) => {
	try {
		const u = await User.query().findById(req.user.id);
		const groups = await u.$relatedQuery("groups");
		for (g of groups) {
			delete g.adminId;
		}
		res.status(200).json(groups);
	} catch (err) {
		next(err);
	}
};

const invite = async (req, res, next) => {
	const schema = Joi.object({
		email: Joi.string().email({
			minDomainSegments: 2, // something.com
			tlds: { allow: ["com"] }
		}).required(),
	});
	try {
		let v = schema.validate(req.query);
		if (v.error) {
			throw new HTTPError(400, v.error.details[0].message);
		}
		v = v.value;
		const g = await getGroup(req.params.groupId);
		const u = await User.query().findOne({
			email: v.email,
		});
		if (!u) {
			throw new HTTPError(404, "No such user");
		}
		const r = await g.$relatedQuery("users").relate(u.id);
		res.status(201).json({message: "Invited"});
	} catch (err) {
		if (err.code && err.code === "ER_DUP_ENTRY") {
			next(new HTTPError(400, "User already in group"));
		} else {
			next(err);
		}
	}
};

const leave = async (req, res, next) => {
	try {
		const g = await getGroup(req.params.groupId);
		if (g.adminId == req.user.id) {
			throw new HTTPError(400, "Group admin cannot leave group");
		}
		const r = await g.$relatedQuery("users").unrelate(req.user.id);
		res.status(204).json({message: "Left"});
	} catch (err) {
		next(err);
	}
};

const kick = (req, res, next) => {
	try {
		throw new HTTPError(501);
	} catch (err) {
		next(err);
	}
};

const getMembers = async (req, res, next) => {
	try {
		const g = await getGroup(req.params.groupId);
		const members = await g.$relatedQuery("users")
			.select("id", "login", "email", "joined")
			.orderBy("joined", "desc");
		res.status(200).json(members);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	create, getUsersGroups, invite, leave, kick, getMembers
};

// vim:noai:ts=4:sw=4
