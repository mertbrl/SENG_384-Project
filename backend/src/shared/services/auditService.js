const { prisma } = require("../../config/database");

function requestIp(req) {
  if (!req) return null;
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
}

function detailsText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const auditService = {
  log({ userId = null, role = "unknown", actionType, targetEntity = "", resultStatus = "success", details = "", ipAddress = null }) {
    return prisma.activityLog.create({
      data: {
        userId,
        role,
        actionType,
        targetEntity,
        resultStatus,
        details: detailsText(details),
        ipAddress,
      },
    });
  },

  fromRequest(req, input) {
    return this.log({
      ...input,
      ipAddress: input.ipAddress || requestIp(req),
    });
  },
};

module.exports = { auditService, requestIp };
