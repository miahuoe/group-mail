const GroupsModel = require('./model');
const groups = new GroupsModel();

const index = ({query, params}, res, next) => {
	res.send(groups.getAll());
}

const byId = ({query, params}, res, next) => {
	res.send(groups.getById(params.id));
}

module.exports = {
	index, byId
};

// vim: noai:ts=4:sw=4
