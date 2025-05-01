const express = require("express");
const router = express.Router();

const { newCreation, getAllCreations } = require("../controllers/creation");
const { simulate } = require("../middlewares/simulate");
const { verifyToken } = require("../middlewares/auth");
const { likeCreation } = require("../controllers/likes");
const { search } = require("../controllers/search");
const { getComments, createComment } = require("../controllers/comment");

router.post("/new-creation", verifyToken, newCreation);
router.get("/get-creations", verifyToken, getAllCreations);

router.post("/:creationId/like", verifyToken, likeCreation);
router.get("/search", verifyToken, search);

// Comment routes
router.get("/:creationId/comments", verifyToken, getComments);
router.post("/:creationId/comments", verifyToken, createComment);

module.exports = router;
