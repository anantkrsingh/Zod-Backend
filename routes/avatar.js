const express = require("express");
const router = express.Router();
const { generateAvatar, getAvatars } = require("../controllers/avatar");
const { verifyToken } = require("../middlewares/auth");

router.post("/generate", generateAvatar);

router.get("/", getAvatars);

module.exports = router; 