const express = require("express");
const CreditCardFormRouter = express.Router({ mergeParams: true });
const CreditCardFormController = require("../controllers/creditCardformController");

CreditCardFormRouter.get(
  "/credit-card-forms",
  CreditCardFormController.creditCardFormsGet
);
CreditCardFormRouter.post(
  "/credit-card-form/create",
  CreditCardFormController.creditCardFormCreatePost
);

module.exports = CreditCardFormRouter;
