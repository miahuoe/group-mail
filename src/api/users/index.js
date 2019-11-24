const { Router } = require("express")
const router = Router()
const { register, login } = require('./controller');

router.post('/register', register);

router.post('/login', login);

module.exports = router;

// vim:noai:ts=4:sw=4
