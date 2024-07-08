const express = require("express");
const FormRouter = express.Router({ mergeParams: true });
const FormController = require("../controllers/formController");

FormRouter.get("/forms", FormController.formsGet);
FormRouter.post("/form/create", FormController.formCreatePost);

module.exports = FormRouter;
