const { Router } = require("express")
const { index, byId } = require("./controller")
const router = Router()

router.get('/', index);

router.get('/:id', byId);

module.exports = router;

// vim:noai:ts=4:sw=4
