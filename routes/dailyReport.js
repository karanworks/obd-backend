const express = require("express");
const DailyReportRouter = express.Router({ mergeParams: true });
const DailyReportController = require("../controllers/dailyReportController");

DailyReportRouter.get("/daily-report", DailyReportController.dailyReportGet);

module.exports = DailyReportRouter;
