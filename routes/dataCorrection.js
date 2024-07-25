const express = require("express");
const DataCorrectionRouter = express.Router();
const DataCorrectionController = require("../controllers/dataCorrectionController");

DataCorrectionRouter.get(
  "/data-correction",
  DataCorrectionController.dataCorrectionGet
);
DataCorrectionRouter.patch(
  "/data-correction",
  DataCorrectionController.dataCorrectionUpdate
);

module.exports = DataCorrectionRouter;
