const Group = require("../groups/model");
const { getMailFromDirectory } = require("./model");
const { connect } = require("../../services/imap");
//const Joi = require("joi");

// https://github.com/mscdex/node-imap

const getMail = async (req, res, next) => {
	try {
		//const g = await Group.query().findById(req.groupId);
		//const i = connect(g.maillocal, g.mailpass);
		const i = connect(process.env.TEST_IMAP_USER, process.env.TEST_IMAP_PASS);
		const m = getMailFromDirectory(i, req.params.directory, (total, next) => "1:"+next).then((mail) => {
			res.status(200).json(mail);
		}).catch((e) => {
			res.status(500).json({
				error: e
			});
		});
	} catch (e) {
		console.log(e);
		res.status(400).json({
			error: e
		});
	}
}

module.exports = {
	getMail
};

// vim: noai:ts=4:sw=4
