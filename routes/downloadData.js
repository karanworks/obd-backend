const express = require("express");
const DownloadDataRouter = express.Router({ mergeParams: true });
const DownloadDataController = require("../controllers/downloadDataController");

DownloadDataRouter.post(
  "/download-data/filter",
  DownloadDataController.downloadDataFilter
);
DownloadDataRouter.get(
  "/download-data/all-data",
  DownloadDataController.downloadAllData
);

module.exports = DownloadDataRouter;
