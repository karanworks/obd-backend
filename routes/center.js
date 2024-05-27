const express = require("express");
const CenterRouter = express.Router({ mergeParams: true });
const CenterController = require("../controllers/centerController");

CenterRouter.get("/centers", CenterController.centersGet);
CenterRouter.post("/center/create", CenterController.centerCreatePost);
CenterRouter.patch(
  "/center/:centerId/edit",
  CenterController.centerUpdatePatch
);
CenterRouter.delete(
  "/center/:centerId/delete",
  CenterController.centerRemoveDelete
);

module.exports = CenterRouter;
