const express = require("express");
const BankCodeRouter = express.Router({ mergeParams: true });
const BankCodeController = require("../controllers/bankCodeController");

BankCodeRouter.get("/bank-codes", BankCodeController.bankCodesGet);
BankCodeRouter.post("/bank-code/create", BankCodeController.bankCodeCreatePost);
BankCodeRouter.patch(
  "/bank-code/:bankCodeId/edit",
  BankCodeController.bankCodeUpdatePatch
);
BankCodeRouter.delete(
  "/bank-code/:bankCodeId/delete",
  BankCodeController.bankCodeRemoveDelete
);

module.exports = BankCodeRouter;
