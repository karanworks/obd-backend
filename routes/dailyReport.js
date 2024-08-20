const express = require("express");
const DailyReportRouter = express.Router({ mergeParams: true });
const DailyReportController = require("../controllers/dailyReportController");

DailyReportRouter.get("/daily-report", DailyReportController.dailyReportGet);

DailyReportRouter.post(
  "/daily-report/filter",
  DailyReportController.dailyReportFilter
);

module.exports = DailyReportRouter;
