const express = require("express");
const CampaignRouter = express.Router({ mergeParams: true });
const CampaignController = require("../controllers/campaignsController");

CampaignRouter.get("/campaigns", CampaignController.campaignsGet);
CampaignRouter.post("/campaign/create", CampaignController.campaignCreatePost);
CampaignRouter.patch(
  "/campaign/:campaignId/edit",
  CampaignController.campaignUpdatePatch
);

module.exports = CampaignRouter;
