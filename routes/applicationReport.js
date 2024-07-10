const express = require("express");
const ApplicationReportRouter = express.Router({ mergeParams: true });
const ApplicationReportController = require("../controllers/applicationReportController");

ApplicationReportRouter.get(
  "/application-report",
  ApplicationReportController.applicationReportGet
);
ApplicationReportRouter.post(
  "/application-report/filter",
  ApplicationReportController.applicationReportFilter
);

module.exports = ApplicationReportRouter;
