const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class ReportController {
  async getReports(req, res) {
    try {
      const token = req.cookies.token;

      const loggedInUser = await prisma.user.findFirst({
        where: {
          token: parseInt(token),
        },
      });

      if (loggedInUser) {
        const data = await prisma.callResponseCDR.findMany({});

        console.log("REPORT API CALLED ->", data);

        response.success(res, "Report fetched!");
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while fetchin report", error);
    }
  }
}

module.exports = new ReportController();
