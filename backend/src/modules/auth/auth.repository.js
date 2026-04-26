const { prisma } = require("../../config/database");

const userInclude = { country: true, city: true };

const authRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userInclude,
    });
  },

  findByVerificationToken(token) {
    return prisma.user.findUnique({
      where: { emailVerificationToken: token },
      include: userInclude,
    });
  },

  createUser(data) {
    return prisma.user.create({
      data,
      include: userInclude,
    });
  },

  verifyEmail(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        verified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
      include: userInclude,
    });
  },

  setVerificationToken(userId, token, expiresAt) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
      },
      include: userInclude,
    });
  },
};

module.exports = { authRepository };
