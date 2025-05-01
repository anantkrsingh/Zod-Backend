const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  googleLogin,
  showResetPasswordForm,
  resetPassword,
  requestPasswordReset,
  getProfile,
  updateProfile,
  getUserProfile,
} = require("../controllers/auth");
const { newCreation } = require("../controllers/creation");
const { simulate } = require("../middlewares/simulate");
const { validateSignup, validateLogin } = require("../middlewares/validator");
const { verifyToken } = require("../middlewares/auth");
const { savePushToken } = require("../controllers/notification");

router.post("/signup", validateSignup, signup);

router.post("/login", validateLogin, login);

router.post("/google-login", googleLogin);

router.post("/new-creation", verifyToken, newCreation);

router.get("/reset-password", (req, res) => {
  res.render("reset-password-request");
});

router.post("/reset-password", requestPasswordReset);
router.get("/reset-password/:token", showResetPasswordForm);
router.post("/reset-password/:token", resetPassword);
router.post("/save-push-token", verifyToken, savePushToken);
router.post("/update-profile", verifyToken, updateProfile);

router.get("/profile", verifyToken, getProfile);
router.get("/:userId/profile", verifyToken, getUserProfile);

module.exports = router;
