const express = require("express");
const DataCorrectionRouter = express.Router();
const DataCorrectionController = require("../controllers/dataCorrectionController");

DataCorrectionRouter.get(
  "/data-correction",
  DataCorrectionController.dataCorrectionGet
);
DataCorrectionRouter.patch(
  "/data-correction/city",
  DataCorrectionController.cityDataCorrectionUpdate
);
DataCorrectionRouter.patch(
  "/data-correction/salary",
  DataCorrectionController.salaryDataCorrectionUpdate
);
DataCorrectionRouter.get(
  "/data-correction/salary-lacs",
  DataCorrectionController.salaryInLacsGet
);
DataCorrectionRouter.get(
  "/data-correction/salary-thousands",
  DataCorrectionController.salaryInThousandsGet
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
