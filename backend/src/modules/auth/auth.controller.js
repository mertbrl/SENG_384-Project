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
        message: "Registration successful. A verification email has been sent to your address.",
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const raw = req.body?.token;
      const token = String(raw ?? "").trim().replace(/\s+/g, "");
      if (!token) throw new ValidationError("Verification token is required.");
      const user = await authService.verifyEmail({ token, ipAddress: requestIp(req) });
      success(res, { message: "Email verified successfully. You can now log in.", user });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmailFromLink(req, res, next) {
    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
    try {
      let token = String(req.query.token || "").trim();
      try {
        token = decodeURIComponent(token);
      } catch {
        /* ignore */
      }
      token = token.replace(/\s+/g, "");
      if (!token) throw new ValidationError("Verification token is required.");
      await authService.verifyEmail({ token, ipAddress: requestIp(req) });
      const successUrl = new URL(frontendUrl);
      successUrl.searchParams.set("verified", "1");
      return res.redirect(302, successUrl.toString());
    } catch (err) {
      if (err.isOperational) {
        const failedUrl = new URL(frontendUrl);
        failedUrl.searchParams.set("verified", "0");
        failedUrl.searchParams.set("error", err.message);
        return res.redirect(302, failedUrl.toString());
      }
      next(err);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw new ValidationError("Email is required.");
      const result = await authService.resendVerification({ email, ipAddress: requestIp(req) });
      success(res, {
        message: result.user?.verified ? "Email is already verified." : "Verification email sent.",
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
