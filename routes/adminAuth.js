const express = require("express");
const adminAuthRouter = express.Router({ mergeParams: true });
const adminAuthController = require("../controllers/adminAuthController");

adminAuthRouter.post("/login", adminAuthController.userLoginPost);
adminAuthRouter.get("/login", adminAuthController.userLoginGet);
adminAuthRouter.post("/register", adminAuthController.userRegisterPost);
adminAuthRouter.post("/user/register", adminAuthController.userRegisterPost);
adminAuthRouter.patch("/user/edit", adminAuthController.userUpdatePatch);
adminAuthRouter.delete(
  "/user/:userId/delete",
  adminAuthController.userRemoveDelete
);
adminAuthRouter.get("/logout", adminAuthController.adminLogoutGet);

module.exports = adminAuthRouter;
