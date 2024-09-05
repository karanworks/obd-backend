const express = require("express");
const ReportRouter = express.Router();
const ReportController = require("../controllers/reportController");

ReportRouter.post("/reports", ReportController.getReports);

module.exports = ReportRouter;
