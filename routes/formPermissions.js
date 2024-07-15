const express = require("express");
const FormPermissionRouter = express.Router({ mergeParams: true });
const FormPermissionController = require("../controllers/formPermissionsController");

FormPermissionRouter.get(
  "/form-permissions/:centerId",
  FormPermissionController.formPermissionsGet
);
FormPermissionRouter.get(
  "/form-permissions",
  FormPermissionController.formAllowedPermissionsGet
);
FormPermissionRouter.post(
  "/form-permissions/update",
  FormPermissionController.formPermissionUpdatePost
);

module.exports = FormPermissionRouter;
