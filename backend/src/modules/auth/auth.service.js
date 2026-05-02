const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { authRepository } = require("./auth.repository");
const { signToken } = require("../../shared/services/tokenService");
const { auditService } = require("../../shared/services/auditService");
const { sendVerificationEmail } = require("../../shared/services/mailService");
const { prisma } = require("../../config/database");
const { resolveLocation, withLocation } = require("../../shared/utils/location");
const {
  ConflictError,
  AuthError,
  ForbiddenError,
  ValidationError,
} = require("../../shared/utils/errors");

const SALT_ROUNDS = 10;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, emailVerificationToken, emailVerificationExpiresAt, ...safe } = withLocation(user);
  return safe;
}

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

const authService = {
  async register({ fullName, email, password, role, institution, city, country, expertise, ipAddress }) {
    const existing = await authRepository.findByEmail(email);
    if (existing) throw new ConflictError("An account already exists with this email.");

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const location = await resolveLocation(prisma, country, city);
    const verificationToken = createVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

    const user = await authRepository.createUser({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      institution: institution || "",
      countryId: location.countryId,
      cityId: location.cityId,
      expertise: expertise || "",
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    await auditService.log({
      userId: user.id,
      role: user.role,
      actionType: "register",
      details: `New ${role} account registered`,
      ipAddress,
    });

    await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      token: verificationToken,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "system",
        message: "Welcome to ClinBridge. Verification email sent to your inbox.",
      },
    });

    return { user: sanitize(user) };
  },

  async verifyEmail({ token, ipAddress }) {
    let normalized = String(token || "").trim();
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      /* keep trimmed string */
    }
    normalized = normalized.replace(/\s+/g, "");
    if (!normalized) throw new ValidationError("Verification token is required.");
    const user = await authRepository.findByVerificationToken(normalized);
    if (!user) {
      throw new ValidationError(
        "This verification link or token is invalid, already used, or no longer in our database (for example after a DB reset or if you clicked an old email after using Resend). Register again or request a new token with Resend.",
      );
    }
    if (user.verified) return sanitize(user);
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      throw new ForbiddenError("Verification token has expired.");
    }
    const verified = await authRepository.verifyEmail(user.id);

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "verification",
        message: "Your email has been verified. You can now log in.",
      },
    });

    await auditService.log({
      userId: user.id,
      role: user.role,
      actionType: "verify_email",
      details: "Email verified",
      ipAddress,
    });

    return sanitize(verified);
  },

  async resendVerification({ email, ipAddress }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("No account found for this email. Check the spelling or register first.");
    }
    if (user.verified) return { user: sanitize(user) };
    const verificationToken = createVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    const updated = await authRepository.setVerificationToken(user.id, verificationToken, verificationExpiresAt);
    await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      token: verificationToken,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "verification",
        message: "A new verification email has been sent.",
      },
    });
    await auditService.log({
      userId: user.id,
      role: user.role,
      actionType: "security_event",
      details: "Verification token regenerated",
      ipAddress,
    });
    return { user: sanitize(updated) };
  },

  async login({ email, password, ipAddress }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      await auditService.log({
        role: "unknown",
        actionType: "failed_login",
        resultStatus: "failed",
        details: "Login failed for unknown account",
        ipAddress,
      });
      throw new AuthError("Invalid email or password.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await auditService.log({
        userId: user.id,
        role: user.role,
        actionType: "failed_login",
        targetEntity: user.id,
        resultStatus: "failed",
        details: "Login failed due to invalid password",
        ipAddress,
      });
      throw new AuthError("Invalid email or password.");
    }

    if (!user.verified) {
      await auditService.log({
        userId: user.id,
        role: user.role,
        actionType: "failed_login",
        targetEntity: user.id,
        resultStatus: "failed",
        details: "Login blocked because email is not verified",
        ipAddress,
      });
      throw new ForbiddenError("Please verify your email before logging in.");
    }

    if (user.suspended) {
      await auditService.log({
        userId: user.id,
        role: user.role,
        actionType: "security_event",
        targetEntity: user.id,
        resultStatus: "blocked",
        details: "Login blocked for suspended account",
        ipAddress,
      });
      throw new ForbiddenError("This account has been suspended. Contact support.");
    }

    await auditService.log({
      userId: user.id,
      role: user.role,
      actionType: "login",
      details: "User logged in",
      ipAddress,
    });

    const token = signToken(user.id, user.role);
    return { token, user: sanitize(user) };
  },

  async logout(user, ipAddress) {
    await auditService.log({
      userId: user.id,
      role: user.role,
      actionType: "logout",
      details: "User logged out",
      ipAddress,
    });
    return { message: "Logged out successfully." };
  },
};

module.exports = { authService };
