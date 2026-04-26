const { logger } = require("../utils/logger");

function requestLogger(req, _res, next) {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    ua: req.headers["user-agent"],
  });
  next();
}

module.exports = { requestLogger };
