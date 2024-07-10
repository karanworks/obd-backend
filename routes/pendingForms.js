const express = require("express");
const PendingFormRouter = express.Router({ mergeParams: true });
const PendingFormController = require("../controllers/pendingFormController");

PendingFormRouter.get("/pending-forms", PendingFormController.pendingFormsGet);
PendingFormRouter.post(
  "/pending-forms/filter",
  PendingFormController.pendingFormsFilter
);

module.exports = PendingFormRouter;
