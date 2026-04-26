const { prisma } = require("../../config/database");
const { postsRepository } = require("./posts.repository");
const { NotFoundError, ForbiddenError, ValidationError } = require("../../shared/utils/errors");
const { resolveLocation, withLocation, withLocations } = require("../../shared/utils/location");

const ALLOWED_STATUSES = ["draft", "active", "meeting_scheduled", "partner_found", "expired"];
const ALLOWED_PROJECT_STAGES = ["idea", "concept_validation", "prototype_developed", "pilot_testing", "pre_deployment"];
const ALLOWED_COLLABORATION_TYPES = ["advisor", "co_founder", "research_partner"];
const TOKEN_SPLIT_PATTERN = /[,;/|]+/;

const editableFields = [
  "title",
  "workingDomain",
  "requiredExpertise",
  "projectStage",
  "healthcareNeed",
  "technicalNeed",
  "commitmentLevel",
  "collaborationType",
  "confidentialityLevel",
  "shortExplanation",
  "highLevelIdea",
  "description",
  "expiryDate",
  "autoClose",
  "status",
];

function normalizeTokens(value) {
  return String(value || "")
    .split(TOKEN_SPLIT_PATTERN)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function findSharedExpertise(post, viewer) {
  const required = normalizeTokens(post.requiredExpertise);
  const expertise = normalizeTokens(viewer.expertise);
  return required.filter((item) => expertise.some((skill) => skill.includes(item) || item.includes(skill)));
}

function buildMatch(post, viewer) {
  const postCity = post.city && post.city.name ? post.city.name : post.city;
  const cityMatch = Boolean(postCity && postCity === viewer.city);
  const sharedExpertise = findSharedExpertise(post, viewer);
  if (cityMatch && sharedExpertise.length) {
    return {
      cityMatch,
      sharedExpertise,
      matchExplanation: `Strong match in ${postCity} with shared expertise: ${sharedExpertise.join(", ")}.`,
    };
  }
  if (cityMatch) {
    return {
      cityMatch,
      sharedExpertise,
      matchExplanation: `Strong local match: both users are in ${postCity}.`,
    };
  }
  if (sharedExpertise.length) {
    return {
      cityMatch,
      sharedExpertise,
      matchExplanation: `Expertise match: ${sharedExpertise.join(", ")}.`,
    };
  }
  return {
    cityMatch,
    sharedExpertise,
    matchExplanation: `Potential match via ${post.requiredExpertise} expertise in ${post.workingDomain}.`,
  };
}

function buildWhere(query, user) {
  const { domain, city, country, status, expertise, stage, search } = query;
  return {
    AND: [
      user.role !== "admin"
        ? {
            OR: [
              { status: { not: "draft" } },
              { userId: user.id },
            ],
          }
        : {},
      domain ? { workingDomain: { contains: domain, mode: "insensitive" } } : {},
      city ? { city: { name: { contains: city, mode: "insensitive" } } } : {},
      country
        ? {
            country: {
              OR: [
                { name: { contains: country, mode: "insensitive" } },
                { code: { contains: country, mode: "insensitive" } },
              ],
            },
          }
        : {},
      status && ALLOWED_STATUSES.includes(status) ? { status } : {},
      expertise ? { requiredExpertise: { contains: expertise, mode: "insensitive" } } : {},
      stage && ALLOWED_PROJECT_STAGES.includes(stage) ? { projectStage: stage } : {},
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { shortExplanation: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { workingDomain: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };
}

function toListItem(post, user) {
  const match = buildMatch(post, user);
  return {
    ...post,
    owner: withLocation(post.owner),
    ...match,
  };
}

function toDetail(post, user) {
  const safePost = withLocation(post);
  const match = buildMatch(safePost, user);
  return {
    ...safePost,
    owner: withLocation(post.owner),
    ...match,
  };
}

function requireOwnerOrAdmin(post, user, message) {
  if (post.userId !== user.id && user.role !== "admin") {
    throw new ForbiddenError(message);
  }
}

function requireVisible(post, user) {
  if (post.status === "draft" && post.userId !== user.id && user.role !== "admin") {
    throw new ForbiddenError("You cannot view this draft.");
  }
}

function normalizePostData(input) {
  const data = {};
  for (const field of editableFields) {
    if (input[field] !== undefined) {
      data[field] = input[field];
    }
  }
  if (data.title !== undefined) data.title = data.title.trim();
  if (data.expiryDate !== undefined) data.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
  if (data.autoClose !== undefined) data.autoClose = Boolean(data.autoClose);
  if (data.status !== undefined && !ALLOWED_STATUSES.includes(data.status)) {
    throw new ValidationError("Invalid status value.");
  }
  if (data.projectStage !== undefined && !ALLOWED_PROJECT_STAGES.includes(data.projectStage)) {
    throw new ValidationError("Invalid project stage value.");
  }
  if (data.collaborationType !== undefined && data.collaborationType && !ALLOWED_COLLABORATION_TYPES.includes(data.collaborationType)) {
    throw new ValidationError("Invalid collaboration type value.");
  }
  return data;
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function ensureFutureExpiry(expiryDate) {
  if (!expiryDate) {
    throw new ValidationError("expiryDate is required before publishing.");
  }
  const parsed = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("expiryDate must be a valid date.");
  }
  if (parsed <= new Date()) {
    throw new ValidationError("expiryDate must be in the future.");
  }
}

function ensurePublishable(post, user) {
  const requiredFields = [
    ["title", "title"],
    ["workingDomain", "workingDomain"],
    ["requiredExpertise", "requiredExpertise"],
    ["shortExplanation", "shortExplanation"],
    ["collaborationType", "collaborationType"],
    ["projectStage", "projectStage"],
    ["commitmentLevel", "commitmentLevel"],
    ["confidentialityLevel", "confidentialityLevel"],
  ];
  const missing = requiredFields.filter(([field]) => !hasText(post[field])).map(([, label]) => label);
  if (user.role === "engineer" && !hasText(post.healthcareNeed)) {
    missing.push("healthcareNeed");
  }
  if (user.role === "healthcare" && !hasText(post.technicalNeed)) {
    missing.push("technicalNeed");
  }
  if (missing.length) {
    throw new ValidationError(`Missing required publishing fields: ${missing.join(", ")}.`);
  }
  ensureFutureExpiry(post.expiryDate);
}

const postsService = {
  async list(user, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where = buildWhere(query, user);
    const [posts, total] = await Promise.all([
      postsRepository.findMany(where, skip, limit),
      postsRepository.count(where),
    ]);
    const normalized = withLocations(posts).map((post) => toListItem(post, user));
    return { posts: normalized, total, page, limit };
  },

  async listMine(user, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const baseWhere = buildWhere(query, user);
    const where = { AND: [{ userId: user.id }, ...baseWhere.AND.slice(1)] };
    const [posts, total] = await Promise.all([
      postsRepository.findMany(where, skip, limit),
      postsRepository.count(where),
    ]);
    const normalized = withLocations(posts).map((post) => toListItem(post, user));
    return { posts: normalized, total, page, limit };
  },

  async getById(user, id) {
    const post = await postsRepository.findById(id);
    if (!post) throw new NotFoundError("Post");
    requireVisible(post, user);
    return toDetail(post, user);
  },

  async create(user, input) {
    const { title, workingDomain, requiredExpertise, country, city } = input;
    if (!title || !workingDomain || !requiredExpertise) {
      throw new ValidationError("title, workingDomain and requiredExpertise are required.");
    }
    const location = await resolveLocation(prisma, country, city, { country: user.country, city: user.city });
    const data = normalizePostData(input);
    const createData = {
      ...data,
      title: title.trim(),
      userId: user.id,
      countryId: location.countryId,
      cityId: location.cityId,
      projectStage: input.projectStage || "idea",
      healthcareNeed: input.healthcareNeed || "",
      technicalNeed: input.technicalNeed || "",
      commitmentLevel: input.commitmentLevel || "medium",
      collaborationType: input.collaborationType || "",
      confidentialityLevel: input.confidentialityLevel || "public",
      shortExplanation: input.shortExplanation || "",
      highLevelIdea: input.highLevelIdea || "",
      description: input.description || "",
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      autoClose: Boolean(input.autoClose),
      status: input.status === "active" ? "active" : "draft",
    };
    if (createData.status === "active") {
      ensurePublishable(createData, user);
    }
    const post = await postsRepository.create(createData);
    await postsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "post_create",
      targetEntity: post.id,
      details: `Post created with status ${post.status}`,
    });
    return withLocation(post);
  },

  async update(user, id, input) {
    const post = await postsRepository.findById(id);
    if (!post) throw new NotFoundError("Post");
    requireOwnerOrAdmin(post, user, "Only the owner or admin can edit this post.");
    const location = input.city !== undefined || input.country !== undefined
      ? await resolveLocation(prisma, input.country, input.city, { country: user.country, city: user.city })
      : null;
    const data = normalizePostData(input);
    const merged = { ...post, ...data };
    if (merged.status === "active") {
      ensurePublishable(merged, user);
    }
    const updated = await postsRepository.update(id, {
      ...data,
      ...(location && { countryId: location.countryId, cityId: location.cityId }),
      updatedAt: new Date(),
    });
    await postsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "post_edit",
      targetEntity: post.id,
      details: "Post updated",
    });
    return withLocation(updated);
  },

  async changeStatus(user, id, status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new ValidationError("Invalid status value.");
    }
    const post = await postsRepository.findById(id);
    if (!post) throw new NotFoundError("Post");
    requireOwnerOrAdmin(post, user, "Only the owner or admin can change post status.");
    if (status === "active") {
      ensurePublishable(post, user);
    }
    const updated = await postsRepository.update(id, { status });
    await postsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "post_status_change",
      targetEntity: post.id,
      details: `Status -> ${status}`,
    });
    return withLocation(updated);
  },

  publish(user, id) {
    return this.changeStatus(user, id, "active");
  },

  closeAsPartnerFound(user, id) {
    return this.changeStatus(user, id, "partner_found");
  },

  expire(user, id) {
    return this.changeStatus(user, id, "expired");
  },

  async remove(user, id) {
    const post = await postsRepository.findById(id);
    if (!post) throw new NotFoundError("Post");
    requireOwnerOrAdmin(post, user, "Only the owner or admin can delete this post.");
    await postsRepository.remove(id);
    await postsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "post_delete",
      targetEntity: id,
      details: "Post deleted",
    });
    return { message: "Post deleted." };
  },
};

module.exports = { postsService };
