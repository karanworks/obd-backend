const express = require("express");
const OBDDataRouter = express.Router({ mergeParams: true });
const OBDDataController = require("../controllers/obdDataController");
const multer = require("multer");

const upload = multer();

OBDDataRouter.get(
  "/obd-data/download",
  OBDDataController.downloadDataForOBDGet
);
// OBDDataRouter.post(
//   "/upload-raw-data",
//   upload.single("data"),
//   OBDDataController.OBDDataRouterPost
// );

module.exports = OBDDataRouter;
