const express = require("express");
const PendingFormRouter = express.Router({ mergeParams: true });
const PendingFormController = require("../controllers/pendingFormController");

PendingFormRouter.get("/pending-forms", PendingFormController.pendingFormsGet);

module.exports = PendingFormRouter;
