//const config = require("../../config");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;

// vim:noai:ts=4:sw=4
