const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  getNotifications,
  updateNotification,
  markAllAsRead,
} = require("../controllers/notification");

router.get("/", verifyToken, getNotifications);

router.patch("/:notificationId", verifyToken, updateNotification);

router.patch("/mark-all-read", verifyToken, markAllAsRead);

module.exports = router;
