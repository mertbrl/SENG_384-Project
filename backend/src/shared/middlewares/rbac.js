const jwt = require("jsonwebtoken");
const { prisma } = require("../../config/database");
const { AuthError, ForbiddenError } = require("../utils/errors");
const { withLocation } = require("../utils/location");

async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthError("Authorization header missing or malformed.");
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { country: true, city: true },
    });
    if (!user) throw new AuthError("User account no longer exists.");
    if (user.suspended) throw new ForbiddenError("This account has been suspended.");

    req.user = withLocation(user);
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new AuthError("Invalid or expired token."));
    }
    next(err);
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access restricted to: ${roles.join(", ")}.`));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
