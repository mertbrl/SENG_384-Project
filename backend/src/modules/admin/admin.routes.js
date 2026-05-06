const { Router } = require("express");
const { authenticate, requireRole } = require("../../shared/middlewares/rbac");
const { success } = require("../../shared/utils/apiResponse");
const { prisma } = require("../../config/database");
const { withLocation, withLocations } = require("../../shared/utils/location");
const { NotFoundError, ValidationError } = require("../../shared/utils/errors");

const router = Router();
const postStatuses = ["draft", "active", "meeting_scheduled", "partner_found", "expired"];

router.use(authenticate, requireRole("admin"));

router.get("/users", async (req, res, next) => {
  try {
    const { role, verified, suspended, city, search } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(verified !== undefined && { verified: verified === "true" }),
        ...(suspended !== undefined && { suspended: suspended === "true" }),
        ...(city && { city: { name: { contains: city, mode: "insensitive" } } }),
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        institution: true,
        city: true,
        country: true,
        verified: true,
        suspended: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    success(res, withLocations(users));
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        country: true,
        city: true,
        posts: true,
        meetingsRequested: true,
        meetingsOwned: true,
        notifications: true,
      },
    });
    if (!user) throw new NotFoundError("User");
    const { passwordHash, emailVerificationToken, emailVerificationExpiresAt, ...safe } = withLocation(user);
    success(res, safe);
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/suspend", async (req, res, next) => {
  try {
    const { suspended } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { suspended: Boolean(suspended) },
      select: { id: true, fullName: true, suspended: true },
    });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: "admin",
        actionType: "admin_suspend_user",
        targetEntity: req.params.id,
        details: `User ${suspended ? "suspended" : "unsuspended"}`,
      },
    });
    success(res, user);
  } catch (err) {
    next(err);
  }
});

router.get("/posts", async (req, res, next) => {
  try {
    const { status, city, domain, search } = req.query;
    const posts = await prisma.post.findMany({
      where: {
        ...(status && { status }),
        ...(city && { city: { name: { contains: city, mode: "insensitive" } } }),
        ...(domain && { workingDomain: { contains: domain, mode: "insensitive" } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { shortExplanation: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        country: true,
        city: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            role: true,
            country: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    success(res, withLocations(posts).map((post) => ({ ...post, owner: withLocation(post.owner) })));
  } catch (err) {
    next(err);
  }
});

router.patch("/posts/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!postStatuses.includes(status)) throw new ValidationError("Invalid status value.");
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { status },
      include: { country: true, city: true },
    });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: "admin",
        actionType: "admin_update_post_status",
        targetEntity: req.params.id,
        details: `Post status set to ${status}`,
      },
    });
    success(res, withLocation(post));
  } catch (err) {
    next(err);
  }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: "admin",
        actionType: "admin_remove_post",
        targetEntity: req.params.id,
        details: "Post removed by admin",
      },
    });
    success(res, { message: "Post removed." });
  } catch (err) {
    next(err);
  }
});

router.get("/logs", async (req, res, next) => {
  try {
    const { actionType, role, userId, date, resultStatus, ipAddress } = req.query;
    const where = {
      ...(actionType && { actionType }),
      ...(role && { role }),
      ...(userId && { userId }),
      ...(resultStatus && { resultStatus }),
      ...(ipAddress && { ipAddress }),
      ...(date && {
        timestamp: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 86400000),
        },
      }),
    };
    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { timestamp: "desc" },
      take: 1000,
    });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: "admin",
        actionType: "admin_view_logs",
        details: "Admin viewed activity logs",
      },
    });
    success(res, logs);
  } catch (err) {
    next(err);
  }
});

router.get("/logs/export", async (req, res, next) => {
  try {
    const logs = await prisma.activityLog.findMany({ orderBy: { timestamp: "desc" } });
    const header = "timestamp,userId,role,actionType,targetEntity,resultStatus,ipAddress,details";
    const rows = logs.map((log) =>
      [log.timestamp.toISOString(), log.userId || "", log.role, log.actionType, log.targetEntity, log.resultStatus, log.ipAddress || "", (log.details || "").replace(/,/g, ";")].join(",")
    );
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: "admin",
        actionType: "admin_view_logs",
        details: "Admin exported activity logs",
      },
    });
    res.type("text/csv");
    res.attachment("activity_logs.csv");
    res.send([header, ...rows].join("\n"));
  } catch (err) {
    next(err);
  }
});

router.get("/logs/anomalies", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedByIp, failedByUser, recentSecurityEvents] = await Promise.all([
      prisma.activityLog.groupBy({
        by: ["ipAddress"],
        where: {
          actionType: "failed_login",
          timestamp: { gte: since },
          ipAddress: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { ipAddress: "desc" } },
        take: 10,
      }),
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: {
          actionType: "failed_login",
          timestamp: { gte: since },
          userId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: {
          actionType: "security_event",
          timestamp: { gte: since },
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
    ]);
    success(res, {
      window: "24h",
      failedLoginByIp: failedByIp.map((item) => ({
        ipAddress: item.ipAddress,
        count: item._count._all,
        risk: item._count._all >= 5 ? "high" : item._count._all >= 3 ? "medium" : "low",
      })),
      failedLoginByUser: failedByUser.map((item) => ({
        userId: item.userId,
        count: item._count._all,
        risk: item._count._all >= 5 ? "high" : item._count._all >= 3 ? "medium" : "low",
      })),
      recentSecurityEvents,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/overview", async (_req, res, next) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalPosts,
      activePosts,
      draftPosts,
      partnerFoundPosts,
      pendingMeetings,
      scheduledMeetings,
      failedLogins24h,
      unreadNotifications,
      logsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verified: true } }),
      prisma.user.count({ where: { suspended: true } }),
      prisma.post.count(),
      prisma.post.count({ where: { status: "active" } }),
      prisma.post.count({ where: { status: "draft" } }),
      prisma.post.count({ where: { status: "partner_found" } }),
      prisma.meeting.count({ where: { status: "pending" } }),
      prisma.meeting.count({ where: { status: "scheduled" } }),
      prisma.activityLog.count({ where: { actionType: "failed_login", timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.notification.count({ where: { read: false } }),
      prisma.activityLog.count(),
    ]);
    success(res, {
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalPosts,
      activePosts,
      draftPosts,
      partnerFoundPosts,
      pendingMeetings,
      scheduledMeetings,
      failedLogins24h,
      unreadNotifications,
      logsCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const [usersByRole, postsByStatus, meetingsByStatus, postsByCity] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      prisma.post.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.meeting.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.post.groupBy({ by: ["cityId"], _count: { cityId: true } }),
    ]);
    const cities = await prisma.city.findMany({
      where: { id: { in: postsByCity.map((item) => item.cityId) } },
    });
    const cityMap = new Map(cities.map((city) => [city.id, city.name]));
    success(res, {
      usersByRole,
      postsByStatus,
      meetingsByStatus,
      postsByCity: postsByCity.map((item) => ({
        cityId: item.cityId,
        city: cityMap.get(item.cityId),
        count: item._count.cityId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
