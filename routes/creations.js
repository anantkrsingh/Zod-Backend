const express = require("express");
const router = express.Router();

const { newCreation } = require("../controllers/creation");
const { simulate } = require("../middlewares/simulate");
const { verifyToken } = require("../middlewares/auth");



router.post("/new-creation", simulate, verifyToken, newCreation);



module.exports = router;
