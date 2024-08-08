const express = require("express");
const BankdropdownRouter = express.Router({ mergeParams: true });
const BankDropdownController = require("../controllers/bankDropdownController");

BankdropdownRouter.get(
  "/dropdown/bank",
  BankDropdownController.bankDropdownsGet
);

module.exports = BankdropdownRouter;
