const express = require("express");
const RunRouter = express.Router({ mergeParams: true });
const RunController = require("../controllers/RunController");
const multer = require("multer");

const upload = multer();

const fileUpload = upload.single("dataFile");

RunRouter.get("/run", RunController.runGet);
RunRouter.post("/run/create", fileUpload, RunController.runCreatePost);
RunRouter.patch("/run/:runId/edit", RunController.runUpdatePatch);
RunRouter.patch("/run/:runId/remove", RunController.runRemoveDelete);

module.exports = RunRouter;
