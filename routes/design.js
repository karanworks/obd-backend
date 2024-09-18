const express = require("express");
const DesignRouter = express.Router({ mergeParams: true });
const DesignController = require("../controllers/designController");
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

const audioUpload = upload.single("messageAudio");

DesignRouter.get("/campaign/:campaignId/designs", DesignController.designsGet);
DesignRouter.post(
  "/design/create",
  audioUpload,
  DesignController.designCreatePost
);
DesignRouter.patch(
  "/design/:designId/edit",
  audioUpload,
  DesignController.designUpdatePatch
);
DesignRouter.patch(
  "/design/:designId/remove",
  DesignController.designRemoveDelete
);

module.exports = DesignRouter;
