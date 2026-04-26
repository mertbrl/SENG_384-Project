const { prisma } = require("../../config/database");

const ownerSelect = {
  id: true,
  fullName: true,
  role: true,
  institution: true,
  country: true,
  city: true,
};

const postInclude = {
  country: true,
  city: true,
  owner: {
    select: ownerSelect,
  },
};

const locationInclude = {
  country: true,
  city: true,
};

const postsRepository = {
  findMany(where, skip, take) {
    return prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count(where) {
    return prisma.post.count({ where });
  },

  findById(id) {
    return prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
  },

  create(data) {
    return prisma.post.create({
      data,
      include: locationInclude,
    });
  },

  update(id, data) {
    return prisma.post.update({
      where: { id },
      data,
      include: locationInclude,
    });
  },

  remove(id) {
    return prisma.post.delete({ where: { id } });
  },

  createActivityLog(data) {
    return prisma.activityLog.create({ data });
  },
};

module.exports = { postsRepository };
