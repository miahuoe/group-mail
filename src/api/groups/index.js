const { Router } = require("express")
const router = Router()
const { create, getUsersGroups, invite } = require("./controller")
const token = require("../../middlewares/token")

router.get('/', token, getUsersGroups);

router.post('/', token, create);

router.get('/:id/invite', token, invite);

module.exports = router;

// vim:noai:ts=4:sw=4
