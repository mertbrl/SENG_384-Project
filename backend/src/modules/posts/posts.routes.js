const { Router } = require("express");
const { authenticate } = require("../../shared/middlewares/rbac");
const { postsController } = require("./posts.controller");
const { interestsController } = require("../interests/interests.controller");

const router = Router();

router.get("/", authenticate, postsController.list);
router.get("/search", authenticate, postsController.search);
router.get("/mine", authenticate, postsController.listMine);
router.post("/:postId/interests", authenticate, interestsController.expressForPost);
router.get("/:id", authenticate, postsController.getById);
router.post("/", authenticate, postsController.create);
router.put("/:id", authenticate, postsController.update);
router.patch("/:id/status", authenticate, postsController.changeStatus);
router.patch("/:id/publish", authenticate, postsController.publish);
router.patch("/:id/close", authenticate, postsController.closeAsPartnerFound);
router.patch("/:id/expire", authenticate, postsController.expire);
router.delete("/:id", authenticate, postsController.remove);

module.exports = router;
