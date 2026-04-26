const { interestsRepository } = require("./interests.repository");
const { NotFoundError, ForbiddenError, ValidationError, ConflictError } = require("../../shared/utils/errors");

const INTEREST_STATUSES = ["pending", "acknowledged", "meeting_requested", "withdrawn"];

function buildWhere(user, query) {
  return {
    AND: [
      user.role === "admin"
        ? {}
        : {
            OR: [{ requesterId: user.id }, { ownerId: user.id }],
          },
      query.postId ? { postId: query.postId } : {},
      query.status && INTEREST_STATUSES.includes(query.status) ? { status: query.status } : {},
    ],
  };
}

function ensureParticipant(interest, user) {
  const isRequester = interest.requesterId === user.id;
  const isOwner = interest.ownerId === user.id;
  if (!isRequester && !isOwner && user.role !== "admin") {
    throw new ForbiddenError("You are not part of this interest workflow.");
  }
}

function ensureOwner(interest, user) {
  if (interest.ownerId !== user.id && user.role !== "admin") {
    throw new ForbiddenError("Only the post owner can propose time slots.");
  }
}

function ensureRequester(interest, user) {
  if (interest.requesterId !== user.id) {
    throw new ForbiddenError("Only the requester can perform this action.");
  }
}

function normalizeMessage(message) {
  const safeMessage = String(message || "").trim();
  if (!safeMessage) {
    throw new ValidationError("A short interest message is required.");
  }
  if (safeMessage.length > 1000) {
    throw new ValidationError("Interest message must be shorter than 1000 characters.");
  }
  return safeMessage;
}

function normalizeSlots(proposedSlots, userId) {
  if (!Array.isArray(proposedSlots)) {
    throw new ValidationError("proposedSlots must be an array.");
  }
  if (proposedSlots.length === 0) {
    throw new ValidationError("At least one proposed slot is required.");
  }
  if (proposedSlots.length > 8) {
    throw new ValidationError("You can propose up to 8 slots at once.");
  }
  return proposedSlots.map((slot) => {
    const proposedAt = new Date(slot);
    if (Number.isNaN(proposedAt.getTime())) {
      throw new ValidationError("Each proposed slot must be a valid date.");
    }
    return { proposedAt, proposedBy: userId };
  });
}

const interestsService = {
  list(user, query = {}) {
    return interestsRepository.findMany(buildWhere(user, query));
  },

  async getById(user, id) {
    const interest = await interestsRepository.findById(id);
    if (!interest) throw new NotFoundError("Interest");
    ensureParticipant(interest, user);
    return interest;
  },

  async express(user, input) {
    if (user.role === "admin") {
      throw new ValidationError("Admins cannot express interest in posts.");
    }
    const post = await interestsRepository.findPostById(input.postId);
    if (!post) throw new NotFoundError("Post");
    if (post.userId === user.id) {
      throw new ValidationError("You cannot express interest in your own post.");
    }
    if (post.status !== "active") {
      throw new ValidationError("Interest can only be expressed for active posts.");
    }
    if (post.owner.role === user.role) {
      throw new ValidationError("Interest must come from the complementary role.");
    }
    const existing = await interestsRepository.findOpenByPostAndRequester(post.id, user.id);
    if (existing) {
      throw new ConflictError("You already have an open interest for this post.");
    }
    const interest = await interestsRepository.create({
      postId: post.id,
      requesterId: user.id,
      ownerId: post.userId,
      message: normalizeMessage(input.message),
    });
    await interestsRepository.createNotification({
      userId: post.userId,
      type: "interest_received",
      message: `${user.fullName} expressed interest in "${post.title}".`,
    });
    await interestsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "interest_express",
      targetEntity: interest.id,
      details: `Interest expressed for post ${post.id}`,
    });
    return interest;
  },

  expressForPost(user, postId, input) {
    return this.express(user, { ...input, postId });
  },

  async acknowledge(user, id, input) {
    const interest = await this.getById(user, id);
    ensureOwner(interest, user);
    if (interest.status === "withdrawn" || interest.status === "meeting_requested") {
      throw new ValidationError("This interest can no longer receive time slots.");
    }
    const slots = normalizeSlots(input.proposedSlots, user.id);
    await interestsRepository.createTimeSlots(id, slots);
    const updated = await interestsRepository.update(id, { status: "acknowledged" });
    await interestsRepository.createNotification({
      userId: interest.requesterId,
      type: "interest_update",
      message: `New meeting time slots were proposed for "${interest.post.title}".`,
    });
    await interestsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "interest_update",
      targetEntity: id,
      details: "Interest acknowledged with proposed time slots",
    });
    return updated;
  },

  async withdraw(user, id) {
    const interest = await this.getById(user, id);
    ensureRequester(interest, user);
    if (interest.status === "meeting_requested") {
      throw new ValidationError("Meeting has already been requested for this interest.");
    }
    if (interest.status === "withdrawn") {
      return interest;
    }
    const updated = await interestsRepository.update(id, { status: "withdrawn" });
    await interestsRepository.createNotification({
      userId: interest.ownerId,
      type: "interest_update",
      message: `${user.fullName} withdrew interest in "${interest.post.title}".`,
    });
    await interestsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "interest_update",
      targetEntity: id,
      details: "Interest withdrawn",
    });
    return updated;
  },

  async requestMeeting(user, id, input) {
    const interest = await this.getById(user, id);
    ensureRequester(interest, user);
    if (interest.status !== "acknowledged") {
      throw new ValidationError("Meeting request requires acknowledged interest with proposed slots.");
    }
    if (interest.post.confidentialityLevel === "nda_required" && !input.ndaAccepted) {
      throw new ValidationError("NDA acceptance is required for this post.");
    }
    const slot = await interestsRepository.findTimeSlot(id, input.slotId);
    if (!slot) throw new NotFoundError("Interest time slot");
    const meeting = await interestsRepository.createMeeting({
      postId: interest.postId,
      interestId: interest.id,
      requesterId: interest.requesterId,
      ownerId: interest.ownerId,
      message: input.message || interest.message,
      ndaAccepted: Boolean(input.ndaAccepted),
      selectedSlot: slot.proposedAt,
      timeSlots: {
        create: [{ proposedAt: slot.proposedAt, proposedBy: slot.proposedBy }],
      },
    });
    await interestsRepository.update(id, { status: "meeting_requested" });
    await interestsRepository.createNotification({
      userId: interest.ownerId,
      type: "meeting_request",
      message: `${user.fullName} requested a meeting for "${interest.post.title}".`,
    });
    await interestsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_request",
      targetEntity: meeting.id,
      details: `Meeting requested from interest ${interest.id}`,
    });
    return meeting;
  },
};

module.exports = { interestsService };
