const { logger } = require("../utils/logger");

function errorHandler(err, req, res, _next) {
  if (err.isOperational) {
    logger.warn(`[${err.statusCode}] ${err.message}`, { path: req.path });
    const body = { success: false, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err.code === "P2002") {
    logger.warn("[409] Unique constraint violation", { path: req.path, meta: err.meta });
    return res.status(409).json({ success: false, message: "A record with this value already exists." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Record not found." });
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack, path: req.path });
  return res.status(500).json({ success: false, message: "An unexpected error occurred." });
}

module.exports = { errorHandler };
