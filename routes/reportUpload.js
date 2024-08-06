const express = require("express");
const ReportUploadRouter = express.Router({ mergeParams: true });
const ReportUploadController = require("../controllers/reportUploadController");

ReportUploadRouter.get(
  "/report-upload",
  ReportUploadController.reportUploadGet
);
ReportUploadRouter.post(
  "/report-upload/update-status",
  ReportUploadController.reportUploadUpdateStatus
);
ReportUploadRouter.post(
  "/report-upload/filter",
  ReportUploadController.reportUploadFilter
);

module.exports = ReportUploadRouter;
