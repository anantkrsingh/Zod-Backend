const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  handleAvailable,
  createHandle,
} = require("../controllers/handleController");

router.post("/available", verifyToken, handleAvailable);

router.post("/", verifyToken, createHandle);

module.exports = router;
