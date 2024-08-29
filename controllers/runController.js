const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class RunController {
  async runGet(req, res) {
    try {
      const token = req.cookies.token;

      const { campaignId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const designs = await prisma.design.findMany({
          where: {
            campaignId: parseInt(campaignId),
            status: 1,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Designs fetched!", {
          ...adminDataWithoutPassword,
          designs,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting design", error);
    }
  }

  async runCreatePost(req, res) {
    try {
      const { campaignId, date } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
      } else {
        response.error(res, "User not logged in");
      }

      response.success(res, "Design created successfully!");
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async runUpdatePatch(req, res) {
    try {
      const { messageText, mobileNumber } = req.body;

      const { designId } = req.params;

      const designFound = await prisma.design.findFirst({
        where: {
          id: parseInt(designId),
        },
      });

      if (designFound) {
        const updatedDesign = await prisma.design.update({
          where: {
            id: designFound.id,
          },

          data: {
            messageText,
            mobileNumber,
          },
        });

        response.success(res, "Design updated successfully!", {
          updatedDesign,
        });
      } else {
        response.error(res, "design not found!");
      }
    } catch (error) {
      console.log("error while updating design controller", error);
    }
  }

  async runRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { designId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const removedDesign = await prisma.design.update({
          where: {
            id: parseInt(designId),
          },
          data: {
            status: 0,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Campaigns fetched!", {
          ...adminDataWithoutPassword,
          removedDesign,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing design", error);
    }
  }
}

module.exports = new RunController();
