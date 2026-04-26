const { Router } = require("express");
const { authenticate } = require("../../shared/middlewares/rbac");
const { success } = require("../../shared/utils/apiResponse");
const { prisma } = require("../../config/database");
const { resolveLocation, withLocation, withLocations } = require("../../shared/utils/location");

const router = Router();

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { passwordHash, ...user } = req.user;
    success(res, user);
  } catch (err) {
    next(err);
  }
});

router.put("/me", authenticate, async (req, res, next) => {
  try {
    const { fullName, institution, city, country, expertise, bio } = req.body;
    const location = city !== undefined || country !== undefined
      ? await resolveLocation(prisma, country, city, { country: req.user.country, city: req.user.city })
      : null;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName && { fullName }),
        ...(institution !== undefined && { institution }),
        ...(location && { countryId: location.countryId, cityId: location.cityId }),
        ...(expertise !== undefined && { expertise }),
        ...(bio !== undefined && { bio }),
      },
      include: { country: true, city: true },
    });
    await prisma.activityLog.create({
      data: { userId: req.user.id, role: req.user.role, actionType: "profile_update", details: "Profile updated" },
    });
    const { passwordHash, ...safe } = withLocation(updated);
    success(res, safe);
  } catch (err) {
    next(err);
  }
});

router.get("/export", authenticate, async (req, res, next) => {
  try {
    const [posts, meetings, notifications] = await Promise.all([
      prisma.post.findMany({
        where: { userId: req.user.id },
        include: { country: true, city: true },
      }),
      prisma.meeting.findMany({
        where: { OR: [{ requesterId: req.user.id }, { ownerId: req.user.id }] },
      }),
      prisma.notification.findMany({ where: { userId: req.user.id } }),
    ]);
    const { passwordHash, ...profile } = req.user;
    await prisma.activityLog.create({
      data: { userId: req.user.id, role: req.user.role, actionType: "data_export", details: "GDPR data export" },
    });
    success(res, { profile, posts: withLocations(posts), meetings, notifications });
  } catch (err) {
    next(err);
  }
});

router.delete("/me", authenticate, async (req, res, next) => {
  try {
    await prisma.activityLog.create({
      data: { userId: req.user.id, role: req.user.role, actionType: "account_delete", details: "GDPR account deletion" },
    });
    await prisma.user.delete({ where: { id: req.user.id } });
    success(res, { message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        role: true,
        institution: true,
        expertise: true,
        bio: true,
        verified: true,
        country: true,
        city: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    success(res, withLocation(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
