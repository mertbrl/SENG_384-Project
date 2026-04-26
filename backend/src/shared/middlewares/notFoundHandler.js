const { NotFoundError } = require("../utils/errors");

function notFoundHandler(req, _res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

module.exports = { notFoundHandler };
