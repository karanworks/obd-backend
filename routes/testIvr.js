const express = require("express");
const TestIVRRouter = express.Router();
const TestIVRController = require("../controllers/testIvrController");

TestIVRRouter.post("/campaign/:campaignId/test-ivr", TestIVRController.testIvr);

module.exports = TestIVRRouter;
