const express = require("express");
const ReportRouter = express.Router();
const ReportController = require("../controllers/reportController");

ReportRouter.get("/reports", ReportController.testIvr);

module.exports = ReportRouter;
