const { meetingsService } = require("./meetings.service");
const { success, created } = require("../../shared/utils/apiResponse");

const meetingsController = {
  async list(req, res, next) {
    try {
      const meetings = await meetingsService.list(req.user);
      success(res, meetings);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const meeting = await meetingsService.getById(req.user, req.params.id);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async request(req, res, next) {
    try {
      const meeting = await meetingsService.request(req.user, req.body);
      created(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const meeting = await meetingsService.update(req.user, req.params.id, req.body);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async patchJoinUrl(req, res, next) {
    try {
      const meeting = await meetingsService.patchJoinUrl(req.user, req.params.id, req.body);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async accept(req, res, next) {
    try {
      const meeting = await meetingsService.accept(req.user, req.params.id);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async decline(req, res, next) {
    try {
      const meeting = await meetingsService.decline(req.user, req.params.id);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const meeting = await meetingsService.cancel(req.user, req.params.id);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async addTimeSlots(req, res, next) {
    try {
      const meeting = await meetingsService.addTimeSlots(req.user, req.params.id, req.body.proposedSlots);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },

  async confirmTimeSlot(req, res, next) {
    try {
      const meeting = await meetingsService.confirmTimeSlot(req.user, req.params.id, req.params.slotId);
      success(res, meeting);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { meetingsController };
