const express = require("express");
const UploadRawData = express.Router({ mergeParams: true });
const UploadRawDataController = require("../controllers/uploadRawDataController");
const multer = require("multer");

const upload = multer();

UploadRawData.post(
  "/upload-raw-data",
  upload.single("data"),
  UploadRawDataController.uploadRawDataPost
);

module.exports = UploadRawData;
