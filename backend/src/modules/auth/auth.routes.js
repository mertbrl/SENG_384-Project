const { Router } = require("express");
const { authController } = require("./auth.controller");
const { registerValidators, loginValidators } = require("./auth.validators");
const { authLimiter } = require("../../shared/middlewares/rateLimiter");
const { authenticate } = require("../../shared/middlewares/rbac");

const router = Router();

router.post("/register", authLimiter, registerValidators, authController.register);
router.get("/verify-email", authController.verifyEmailFromLink);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authLimiter, authController.resendVerification);
router.post("/login", authLimiter, loginValidators, authController.login);
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
