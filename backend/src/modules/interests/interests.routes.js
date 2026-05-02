const { Router } = require("express");
const { authenticate } = require("../../shared/middlewares/rbac");
const { interestsController } = require("./interests.controller");

const router = Router();

router.get("/", authenticate, interestsController.list);
router.get("/:id", authenticate, interestsController.getById);
router.post("/", authenticate, interestsController.express);
router.post("/:id/time-slots", authenticate, interestsController.acknowledge);
router.patch("/:id/withdraw", authenticate, interestsController.withdraw);
router.patch("/:id/reinstate", authenticate, interestsController.reinstateWithdrawn);
router.post("/:id/meeting-request", authenticate, interestsController.requestMeeting);

module.exports = router;
