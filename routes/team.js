const express = require("express");
const TeamRouter = express.Router({ mergeParams: true });
const TeamController = require("../controllers/teamController");

TeamRouter.get("/teams", TeamController.teamsGet);
TeamRouter.post("/team/create", TeamController.teamCreatePost);
TeamRouter.patch("/team/:teamId/edit", TeamController.teamUpdatePatch);
// TeamRouter.delete("/teams/:teamId/delete", TeamController.centerRemoveDelete);

module.exports = TeamRouter;
