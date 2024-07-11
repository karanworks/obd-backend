const express = require("express");
const LoanFormRouter = express.Router({ mergeParams: true });
const LoanFormController = require("../controllers/loanFormController");

LoanFormRouter.get("/loan-forms", LoanFormController.loanFormsGet);
LoanFormRouter.post("/loan-form/create", LoanFormController.loanFormCreatePost);

module.exports = LoanFormRouter;
