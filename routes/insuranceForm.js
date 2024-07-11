const express = require("express");
const InsuranceFormRouter = express.Router({ mergeParams: true });
const InsuranceFormController = require("../controllers/insuranceFormController");

InsuranceFormRouter.get(
  "/insurance-forms",
  InsuranceFormController.insuranceFormsGet
);
InsuranceFormRouter.post(
  "/insurance-form/create",
  InsuranceFormController.insuranceFormCreatePost
);

module.exports = InsuranceFormRouter;
