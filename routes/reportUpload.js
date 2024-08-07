const express = require("express");
const ReportUploadRouter = express.Router({ mergeParams: true });
const ReportUploadController = require("../controllers/reportUploadController");
const multer = require("multer");

const upload = multer();

ReportUploadRouter.get(
  "/report-upload",
  ReportUploadController.reportUploadGet
);
ReportUploadRouter.post(
  "/report-upload/update-status",
  ReportUploadController.reportUploadUpdateStatus
);
ReportUploadRouter.post(
  "/report-upload/update-status/file",
  upload.single("data"),
  ReportUploadController.reportUploadUpdateStatusWithFile
);
ReportUploadRouter.post(
  "/report-upload/filter",
  ReportUploadController.reportUploadFilter
);
ReportUploadRouter.delete(
  "/report-upload/bank-status/:bankStatusId/delete",
  ReportUploadController.reportUploadDeleteStatus
);

module.exports = ReportUploadRouter;
