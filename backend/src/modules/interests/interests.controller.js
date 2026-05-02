const { interestsService } = require("./interests.service");
const { success, created } = require("../../shared/utils/apiResponse");

const interestsController = {
  async list(req, res, next) {
    try {
      const interests = await interestsService.list(req.user, req.query);
      success(res, interests);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const interest = await interestsService.getById(req.user, req.params.id);
      success(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async express(req, res, next) {
    try {
      const interest = await interestsService.express(req.user, req.body);
      created(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async expressForPost(req, res, next) {
    try {
      const interest = await interestsService.expressForPost(req.user, req.params.postId, req.body);
      created(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async acknowledge(req, res, next) {
    try {
      const interest = await interestsService.acknowledge(req.user, req.params.id, req.body);
      success(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async withdraw(req, res, next) {
    try {
      const interest = await interestsService.withdraw(req.user, req.params.id);
      success(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async reinstateWithdrawn(req, res, next) {
    try {
      const interest = await interestsService.reinstateWithdrawn(req.user, req.params.id);
      success(res, interest);
    } catch (err) {
      next(err);
    }
  },

  async requestMeeting(req, res, next) {
    try {
      const meeting = await interestsService.requestMeeting(req.user, req.params.id, req.body);
      created(res, meeting);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { interestsController };
