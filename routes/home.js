const express = require("express");
const HomeRouter = express.Router({ mergeParams: true });
const HomeController = require("../controllers/homeController");

HomeRouter.get("/home", HomeController.homeGet);

module.exports = HomeRouter;
