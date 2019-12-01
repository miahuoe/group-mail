const { Router } = require("express")
const router = Router()
const { addPost, getPosts } = require("./controller")
const token = require("../../middlewares/token")

router.get('/', token, getPosts);

router.post('/', token, addPost);

module.exports = router;

// vim:noai:ts=4:sw=4
