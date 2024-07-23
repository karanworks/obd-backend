const express = require("express");
const UploadRawData = express.Router({ mergeParams: true });
const UploadRawDataController = require("../controllers/uploadRawDataController");
const UploadRawDataController2 = require("../controllers/uploadRawDataController2");
const multer = require("multer");

const upload = multer();

UploadRawData.post(
  "/upload-raw-data",
  upload.single("data"),
  UploadRawDataController2.uploadRawDataPost
);

module.exports = UploadRawData;
