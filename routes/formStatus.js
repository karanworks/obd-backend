const express = require("express");
const FormStatusRouter = express.Router({ mergeParams: true });
const FormStatusController = require("../controllers/formStatusController");

FormStatusRouter.patch(
  "/form/status-update",
  FormStatusController.formStatusUpdatePost
);
// FormStatusRouter.patch("/form/update", FormStatusController.formCreatePost);

module.exports = FormStatusRouter;
