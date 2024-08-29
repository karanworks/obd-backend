const express = require("express");
const CampaignRouter = express.Router({ mergeParams: true });
const CampaignController = require("../controllers/campaignsController");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "asterisk/audio/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const multiUpload = upload.fields([
  { name: "welcomeMessageAudio", maxCount: 1 },
  { name: "invalidMessageAudio", maxCount: 1 },
  { name: "timeOutMessageAudio", maxCount: 1 },
]);

CampaignRouter.get("/campaigns", CampaignController.campaignsGet);
CampaignRouter.post(
  "/campaign/create",
  multiUpload,
  CampaignController.campaignCreatePost
);
CampaignRouter.patch(
  "/campaign/:campaignId/edit",
  CampaignController.campaignUpdatePatch
);
CampaignRouter.patch(
  "/campaign/:campaignId/remove",
  CampaignController.campaignsRemoveDelete
);

module.exports = CampaignRouter;
