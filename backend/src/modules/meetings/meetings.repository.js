const { prisma } = require("../../config/database");

const meetingsRepository = {
  findForUser(userId) {
    return prisma.meeting.findMany({
      where: {
        OR: [{ requesterId: userId }, { ownerId: userId }],
      },
      include: {
        post: { select: { title: true, workingDomain: true } },
        requester: { select: { id: true, fullName: true, role: true } },
        owner: { select: { id: true, fullName: true, role: true } },
        timeSlots: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findPostById(id) {
    return prisma.post.findUnique({ where: { id } });
  },

  create(data) {
    return prisma.meeting.create({
      data,
      include: { timeSlots: true },
    });
  },

  findById(id) {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        post: { select: { title: true, userId: true, workingDomain: true } },
        requester: { select: { id: true, fullName: true, role: true } },
        owner: { select: { id: true, fullName: true, role: true } },
        timeSlots: true,
      },
    });
  },

  findTimeSlot(meetingId, slotId) {
    return prisma.timeSlot.findFirst({
      where: { id: slotId, meetingId },
    });
  },

  createTimeSlots(meetingId, slots) {
    return prisma.timeSlot.createMany({
      data: slots.map((slot) => ({ ...slot, meetingId })),
    });
  },

  update(id, data) {
    return prisma.meeting.update({
      where: { id },
      data,
    });
  },

  updatePost(id, data) {
    return prisma.post.update({
      where: { id },
      data,
    });
  },

  createNotification(data) {
    return prisma.notification.create({ data });
  },

  createActivityLog(data) {
    return prisma.activityLog.create({ data });
  },
};

module.exports = { meetingsRepository };
