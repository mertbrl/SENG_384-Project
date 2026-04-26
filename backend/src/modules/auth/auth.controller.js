const { validationResult } = require("express-validator");
const { authService } = require("./auth.service");
const { success, created } = require("../../shared/utils/apiResponse");
const { ValidationError } = require("../../shared/utils/errors");
const { requestIp } = require("../../shared/services/auditService");

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError("Validation failed.", errors.array());
  }
}

const authController = {
  async register(req, res, next) {
    try {
      validate(req);
      const result = await authService.register({ ...req.body, ipAddress: requestIp(req) });
      created(res, {
        message: "Registration successful. Please verify your email before logging in.",
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) throw new ValidationError("Verification token is required.");
      const user = await authService.verifyEmail({ token, ipAddress: requestIp(req) });
      success(res, { message: "Email verified successfully. You can now log in.", user });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw new ValidationError("Email is required.");
      const result = await authService.resendVerification({ email, ipAddress: requestIp(req) });
      success(res, {
        message: result.verificationToken ? "Verification token generated." : "Email is already verified.",
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      validate(req);
      const { token, user } = await authService.login({ ...req.body, ipAddress: requestIp(req) });
      success(res, { token, user });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      success(res, req.user);
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user, requestIp(req));
      success(res, result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { authController };
