const express = require("express");
const router = express.Router();

const { newCreation, getAllCreations } = require("../controllers/creation");
const { simulate } = require("../middlewares/simulate");
const { verifyToken } = require("../middlewares/auth");



router.post("/new-creation", simulate, verifyToken, newCreation);
router.get("/get-creations",simulate,verifyToken,getAllCreations)



module.exports = router;
