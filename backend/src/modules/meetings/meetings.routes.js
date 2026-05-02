const { Router } = require("express");
const { authenticate } = require("../../shared/middlewares/rbac");
const { meetingsController } = require("./meetings.controller");

const router = Router();

router.get("/", authenticate, meetingsController.list);
router.get("/:id", authenticate, meetingsController.getById);
router.post("/", authenticate, meetingsController.request);
router.post("/:id/time-slots", authenticate, meetingsController.addTimeSlots);
router.patch("/:id/join-url", authenticate, meetingsController.patchJoinUrl);
router.patch("/:id", authenticate, meetingsController.update);
router.patch("/:id/accept", authenticate, meetingsController.accept);
router.patch("/:id/decline", authenticate, meetingsController.decline);
router.patch("/:id/cancel", authenticate, meetingsController.cancel);
router.patch("/:id/time-slots/:slotId/confirm", authenticate, meetingsController.confirmTimeSlot);

module.exports = router;
