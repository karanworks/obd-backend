const express = require("express");
const FormStatusRouter = express.Router({ mergeParams: true });
const FormStatusController = require("../controllers/formStatusController");

FormStatusRouter.patch(
  "/form/status-update",
  FormStatusController.formStatusUpdatePost
);

module.exports = FormStatusRouter;
