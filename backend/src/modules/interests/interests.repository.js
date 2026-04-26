const { prisma } = require("../../config/database");

const userSelect = {
  id: true,
  fullName: true,
  role: true,
  institution: true,
  country: true,
  city: true,
};

const postSelect = {
  id: true,
  userId: true,
  title: true,
  workingDomain: true,
  requiredExpertise: true,
  confidentialityLevel: true,
  status: true,
  owner: {
    select: userSelect,
  },
};

const interestInclude = {
  post: {
    select: postSelect,
  },
  requester: {
    select: userSelect,
  },
  owner: {
    select: userSelect,
  },
  timeSlots: {
    orderBy: { proposedAt: "asc" },
  },
  meetings: {
    select: {
      id: true,
      status: true,
      selectedSlot: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
};

const interestsRepository = {
  findMany(where) {
    return prisma.interest.findMany({
      where,
      include: interestInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id) {
    return prisma.interest.findUnique({
      where: { id },
      include: interestInclude,
    });
  },

  findPostById(id) {
    return prisma.post.findUnique({
      where: { id },
      select: postSelect,
    });
  },

  findOpenByPostAndRequester(postId, requesterId) {
    return prisma.interest.findFirst({
      where: {
        postId,
        requesterId,
        status: { not: "withdrawn" },
      },
    });
  },

  create(data) {
    return prisma.interest.create({
      data,
      include: interestInclude,
    });
  },

  update(id, data) {
    return prisma.interest.update({
      where: { id },
      data,
      include: interestInclude,
    });
  },

  createTimeSlots(interestId, slots) {
    return prisma.interestTimeSlot.createMany({
      data: slots.map((slot) => ({ ...slot, interestId })),
    });
  },

  findTimeSlot(interestId, slotId) {
    return prisma.interestTimeSlot.findFirst({
      where: { id: slotId, interestId },
    });
  },

  createMeeting(data) {
    return prisma.meeting.create({
      data,
      include: {
        post: { select: { id: true, title: true, workingDomain: true } },
        requester: { select: userSelect },
        owner: { select: userSelect },
        timeSlots: true,
      },
    });
  },

  createNotification(data) {
    return prisma.notification.create({ data });
  },

  createActivityLog(data) {
    return prisma.activityLog.create({ data });
  },
};

module.exports = { interestsRepository };
