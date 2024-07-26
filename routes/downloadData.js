const express = require("express");
const DownloadDataRouter = express.Router({ mergeParams: true });
const DownloadDataController = require("../controllers/downloadDataController");

DownloadDataRouter.post(
  "/download-data/filter",
  DownloadDataController.downloadDataFilter
);

module.exports = DownloadDataRouter;
