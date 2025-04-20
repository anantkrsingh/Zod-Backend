const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  googleLogin,
  showResetPasswordForm,
  resetPassword,
  requestPasswordReset,
} = require("../controllers/auth");
const { newCreation } = require("../controllers/creation");
const { simulate } = require("../middlewares/simulate");
const { validateSignup, validateLogin } = require("../middlewares/validator");
const { verifyToken } = require("../middlewares/auth");

router.post("/signup", validateSignup, simulate, signup);

router.post("/login", validateLogin, simulate, login);

router.post("/google-login", simulate, googleLogin);

router.post("/new-creation", simulate, verifyToken, newCreation);

router.get("/reset-password", (req, res) => {
  res.render("reset-password-request");
});

router.post("/reset-password", requestPasswordReset);
router.get("/reset-password/:token", showResetPasswordForm);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
