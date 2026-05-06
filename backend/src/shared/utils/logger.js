const winston = require("winston");

const isProduction = process.env.NODE_ENV === "production";

const loggerFormat = isProduction
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} [${level}]: ${message}${extra}`;
      })
    );

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: loggerFormat,
  transports: [new winston.transports.Console()],
});

module.exports = { logger };
