const express = require("express");
const TargetRouter = express.Router({ mergeParams: true });
const TargetController = require("../controllers/targetController");

TargetRouter.get("/target", TargetController.targetGet);
TargetRouter.post("/target/create", TargetController.targetCreatePost);
TargetRouter.patch(
  "/team/:teamId/target/:targetId/edit",
  TargetController.targetUpdatePatch
);
// TargetRouter.delete(
//   "/center/:centerId/center-user/:centerUserId/delete",
//   TargetController.centerUserRemoveDelete
// );

module.exports = TargetRouter;
