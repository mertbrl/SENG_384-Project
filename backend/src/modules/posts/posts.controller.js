const { postsService } = require("./posts.service");
const { success, created } = require("../../shared/utils/apiResponse");

const postsController = {
  async list(req, res, next) {
    try {
      const result = await postsService.list(req.user, req.query);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const result = await postsService.list(req.user, req.query);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const result = await postsService.listMine(req.user, req.query);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const post = await postsService.getById(req.user, req.params.id);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const post = await postsService.create(req.user, req.body);
      created(res, post);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const post = await postsService.update(req.user, req.params.id, req.body);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async changeStatus(req, res, next) {
    try {
      const post = await postsService.changeStatus(req.user, req.params.id, req.body.status);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async publish(req, res, next) {
    try {
      const post = await postsService.publish(req.user, req.params.id);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async closeAsPartnerFound(req, res, next) {
    try {
      const post = await postsService.closeAsPartnerFound(req.user, req.params.id);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async expire(req, res, next) {
    try {
      const post = await postsService.expire(req.user, req.params.id);
      success(res, post);
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await postsService.remove(req.user, req.params.id);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { postsController };
