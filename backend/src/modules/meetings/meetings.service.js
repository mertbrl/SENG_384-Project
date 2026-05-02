const { meetingsRepository } = require("./meetings.repository");
const { NotFoundError, ForbiddenError, ValidationError } = require("../../shared/utils/errors");

const ALLOWED_STATUSES = ["accepted", "declined", "cancelled", "scheduled"];

function normalizeSlots(proposedSlots, userId) {
  if (!proposedSlots) return undefined;
  if (!Array.isArray(proposedSlots)) {
    throw new ValidationError("proposedSlots must be an array.");
  }
  return proposedSlots.map((slot) => {
    const proposedAt = new Date(slot);
    if (Number.isNaN(proposedAt.getTime())) {
      throw new ValidationError("Each proposed slot must be a valid date.");
    }
    return { proposedAt, proposedBy: userId };
  });
}

function normalizeSelectedSlot(selectedSlot) {
  if (!selectedSlot) return null;
  const parsed = new Date(selectedSlot);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("selectedSlot must be a valid date.");
  }
  return parsed;
}

/** Returns null to clear the link; otherwise a trimmed https? URL string. */
function normalizeJoinUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (s.length > 2000) {
    throw new ValidationError("Join link is too long (max 2000 characters).");
  }
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    throw new ValidationError("Join link must be a valid http or https URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ValidationError("Join link must start with http:// or https://");
  }
  return s;
}

function requireMeetingParticipant(meeting, user) {
  const isOwner = meeting.ownerId === user.id;
  const isRequester = meeting.requesterId === user.id;
  if (!isOwner && !isRequester && user.role !== "admin") {
    throw new ForbiddenError("You are not a participant in this meeting.");
  }
  return { isOwner, isRequester, isAdmin: user.role === "admin" };
}

function requireTransitionPermission(meeting, user, status) {
  const { isOwner, isRequester, isAdmin } = requireMeetingParticipant(meeting, user);
  if ((status === "accepted" || status === "declined" || status === "scheduled") && !isOwner && !isAdmin) {
    throw new ForbiddenError("Only the post owner or admin can make this meeting decision.");
  }
  if (status === "cancelled" && !isRequester && !isAdmin) {
    throw new ForbiddenError("Only the requester or admin can cancel this meeting request.");
  }
  return { isOwner, isRequester, isAdmin };
}

const meetingsService = {
  list(user) {
    return meetingsRepository.findForUser(user.id);
  },

  async getById(user, id) {
    const meeting = await meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundError("Meeting");
    requireMeetingParticipant(meeting, user);
    return meeting;
  },

  async request(user, input) {
    const { postId, message, ndaAccepted, proposedSlots } = input;
    const post = await meetingsRepository.findPostById(postId);
    if (!post) throw new NotFoundError("Post");
    if (post.userId === user.id) {
      throw new ValidationError("You cannot request a meeting for your own post.");
    }
    if (post.confidentialityLevel === "nda_required" && !ndaAccepted) {
      throw new ValidationError("NDA acceptance is required for this post.");
    }
    const slots = normalizeSlots(proposedSlots, user.id);
    const meeting = await meetingsRepository.create({
      postId,
      requesterId: user.id,
      ownerId: post.userId,
      message: message || "",
      ndaAccepted: Boolean(ndaAccepted),
      timeSlots: slots ? { create: slots } : undefined,
    });
    await meetingsRepository.createNotification({
      userId: post.userId,
      type: "meeting_request",
      message: `${user.fullName} sent a meeting request for "${post.title}".`,
    });
    await meetingsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_request",
      targetEntity: meeting.id,
      details: `Meeting request for post ${postId}`,
    });
    return meeting;
  },

  async update(user, id, input) {
    const { status, selectedSlot } = input;
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new ValidationError("Invalid meeting status.");
    }
    const meeting = await meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundError("Meeting");
    const { isOwner } = requireTransitionPermission(meeting, user, status);
    const parsedSlot = normalizeSelectedSlot(selectedSlot);
    if (status === "scheduled" && !parsedSlot && !meeting.selectedSlot) {
      throw new ValidationError("A selected slot is required before scheduling a meeting.");
    }
    const updated = await meetingsRepository.update(id, {
      status,
      ...(parsedSlot && { selectedSlot: parsedSlot }),
    });
    if (status === "accepted" || status === "scheduled") {
      await meetingsRepository.updatePost(meeting.postId, { status: "meeting_scheduled" });
    }
    const notifyUserId = isOwner ? meeting.requesterId : meeting.ownerId;
    await meetingsRepository.createNotification({
      userId: notifyUserId,
      type: "meeting_update",
      message: `Your meeting request for "${meeting.post.title}" is now ${status}.`,
    });
    await meetingsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_update",
      targetEntity: meeting.id,
      details: `Meeting status -> ${status}`,
    });
    return updated;
  },

  async accept(user, id) {
    const meeting = await meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundError("Meeting");
    if (meeting.ownerId !== user.id && user.role !== "admin") {
      throw new ForbiddenError("Only the post owner or admin can accept this meeting.");
    }
    return this.update(user, id, { status: meeting.selectedSlot ? "scheduled" : "accepted" });
  },

  async decline(user, id) {
    const meeting = await meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundError("Meeting");
    if (meeting.ownerId !== user.id && user.role !== "admin") {
      throw new ForbiddenError("Only the post owner or admin can decline this meeting.");
    }
    return this.update(user, id, { status: "declined" });
  },

  cancel(user, id) {
    return this.update(user, id, { status: "cancelled" });
  },

  async addTimeSlots(user, id, proposedSlots) {
    const meeting = await this.getById(user, id);
    if (meeting.status === "cancelled" || meeting.status === "declined") {
      throw new ValidationError("Cannot add time slots to a closed meeting request.");
    }
    const slots = normalizeSlots(proposedSlots, user.id);
    if (!slots || slots.length === 0) {
      throw new ValidationError("At least one proposed slot is required.");
    }
    await meetingsRepository.createTimeSlots(id, slots);
    await meetingsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_update",
      targetEntity: id,
      details: "Meeting time slots added",
    });
    return meetingsRepository.findById(id);
  },

  async patchJoinUrl(user, id, input) {
    const meeting = await this.getById(user, id);
    if (meeting.status === "declined" || meeting.status === "cancelled") {
      throw new ValidationError("Cannot set a join link for a cancelled or declined meeting.");
    }
    const joinUrl = normalizeJoinUrl(input.joinUrl);
    await meetingsRepository.update(id, { joinUrl });
    const updated = await meetingsRepository.findById(id);
    const notifyUserId = meeting.ownerId === user.id ? meeting.requesterId : meeting.ownerId;
    await meetingsRepository.createNotification({
      userId: notifyUserId,
      type: "meeting_update",
      message: joinUrl
        ? `A video meeting link was added for "${updated.post.title}".`
        : `The video meeting link was removed for "${updated.post.title}".`,
    });
    await meetingsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_update",
      targetEntity: meeting.id,
      details: joinUrl ? "Meeting join URL set" : "Meeting join URL cleared",
    });
    return updated;
  },

  async confirmTimeSlot(user, id, slotId) {
    const meeting = await this.getById(user, id);
    if (meeting.status === "cancelled" || meeting.status === "declined") {
      throw new ValidationError("Cannot confirm a slot for a closed meeting request.");
    }
    const slot = await meetingsRepository.findTimeSlot(id, slotId);
    if (!slot) throw new NotFoundError("Time slot");
    const updated = await meetingsRepository.update(id, {
      status: "scheduled",
      selectedSlot: slot.proposedAt,
    });
    await meetingsRepository.updatePost(meeting.postId, { status: "meeting_scheduled" });
    const notifyUserId = meeting.ownerId === user.id ? meeting.requesterId : meeting.ownerId;
    await meetingsRepository.createNotification({
      userId: notifyUserId,
      type: "meeting_update",
      message: `A meeting slot for "${meeting.post.title}" has been confirmed.`,
    });
    await meetingsRepository.createActivityLog({
      userId: user.id,
      role: user.role,
      actionType: "meeting_update",
      targetEntity: meeting.id,
      details: "Meeting slot confirmed",
    });
    return updated;
  },
};

module.exports = { meetingsService };
