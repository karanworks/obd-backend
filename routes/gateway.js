const express = require("express");
const GatewayRouter = express.Router({ mergeParams: true });
const GatewayController = require("../controllers/gatewayController");

GatewayRouter.get("/gateways", GatewayController.gatewayGet);
GatewayRouter.post("/gateway/create", GatewayController.gatewayCreatePost);
GatewayRouter.patch(
  "/gateway/:gatewayId/edit",
  GatewayController.gatewayUpdatePatch
);
GatewayRouter.patch(
  "/gateway/:gatewayId/remove",
  GatewayController.gatewayRemoveDelete
);

module.exports = GatewayRouter;
