const express = require("express");
const DematAccountFormRouter = express.Router({ mergeParams: true });
const DematAccountFormController = require("../controllers/dematAccountFormController");

DematAccountFormRouter.get(
  "/demat-account-forms",
  DematAccountFormController.dematAccountFormsGet
);
DematAccountFormRouter.post(
  "/demat-account-form/create",
  DematAccountFormController.dematAccountFormCreatePost
);

module.exports = DematAccountFormRouter;
