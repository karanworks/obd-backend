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
DownloadDataRouter.get(
  "/download-data/state-data/:stateId",
  DownloadDataController.downloadStateData
);

module.exports = DownloadDataRouter;
