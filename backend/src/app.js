require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./shared/middlewares/errorHandler");
const { requestLogger } = require("./shared/middlewares/requestLogger");
const { rateLimiter } = require("./shared/middlewares/rateLimiter");
const { notFoundHandler } = require("./shared/middlewares/notFoundHandler");

const authRouter = require("./modules/auth/auth.routes");
const usersRouter = require("./modules/users/users.routes");
const postsRouter = require("./modules/posts/posts.routes");
const interestsRouter = require("./modules/interests/interests.routes");
const meetingsRouter = require("./modules/meetings/meetings.routes");
const notificationsRouter = require("./modules/notifications/notifications.routes");
const adminRouter = require("./modules/admin/admin.routes");
const locationsRouter = require("./modules/locations/locations.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter);
app.use(requestLogger);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "ClinBridge API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);
app.use("/api/interests", interestsRouter);
app.use("/api/meetings", meetingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/locations", locationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
