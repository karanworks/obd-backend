const express = require("express");
const CenterUserRouter = express.Router({ mergeParams: true });
const CenterUserController = require("../controllers/centerUserController");

CenterUserRouter.get(
  "/center/:centerId/center-users",
  CenterUserController.centerUsersGet
);
CenterUserRouter.post(
  "/center/:centerId/center-user/create",
  CenterUserController.centerUserCreatePost
);
CenterUserRouter.patch(
  "/center/:centerId/center-user/:centerUserId/edit",
  CenterUserController.centerUserUpdatePatch
);
CenterUserRouter.delete(
  "/center/:centerId/center-user/:centerUserId/delete",
  CenterUserController.centerUserRemoveDelete
);

module.exports = CenterUserRouter;
