const { Router } = require("express");
const { authenticate } = require("../../shared/middlewares/rbac");
const { success } = require("../../shared/utils/apiResponse");
const { prisma } = require("../../config/database");
const { NotFoundError } = require("../../shared/utils/errors");

const router = Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly === "true" && { read: false }),
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });
    success(res, notifications);
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });
    success(res, { count });
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    success(res, { message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
});

router.delete("/read", authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user.id, read: true },
    });
    success(res, { message: "Read notifications deleted.", deletedCount: result.count });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) throw new NotFoundError("Notification");
    success(res, notification);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true },
    });
    if (result.count === 0) throw new NotFoundError("Notification");
    success(res, { message: "Marked as read." });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/unread", authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: false },
    });
    if (result.count === 0) throw new NotFoundError("Notification");
    success(res, { message: "Marked as unread." });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (result.count === 0) throw new NotFoundError("Notification");
    success(res, { message: "Notification deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
