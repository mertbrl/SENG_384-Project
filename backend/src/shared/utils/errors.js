class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, 404);
  }
}

class AuthError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed.", details = []) {
    super(message, 422);
    this.details = details;
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
  ConflictError,
};
