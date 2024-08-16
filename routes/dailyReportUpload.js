const express = require("express");
const DailyReportUploadRouter = express.Router({ mergeParams: true });
const DailyReportUploadController = require("../controllers/dailyReportUploadController");
const multer = require("multer");

const upload = multer();

DailyReportUploadRouter.get(
  "/daily-report-upload",
  DailyReportUploadController.dailyReportUploadGet
);

DailyReportUploadRouter.post(
  "/daily-report-upload",
  upload.single("data"),
  DailyReportUploadController.dailyReportUploadPost
);

module.exports = DailyReportUploadRouter;
