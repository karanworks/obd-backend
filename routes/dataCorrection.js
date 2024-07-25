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
DataCorrectionRouter.get(
  "/data-correction/states",
  DataCorrectionController.statesGet
);
DataCorrectionRouter.get(
  "/data-correction/states/:stateId/cities",
  DataCorrectionController.citiesGet
);
DataCorrectionRouter.get(
  "/data-correction/cities/:cityId/pin-codes",
  DataCorrectionController.pinCodesGet
);

module.exports = DataCorrectionRouter;
