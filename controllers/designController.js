const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class DesignController {
  async designsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const designs = await prisma.design.findMany({
          where: {
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

  async designCreatePost(req, res) {
    try {
      const { key, messageText, mobileNumber, campaignId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        let newDesign;

        if (messageText) {
          newDesign = await prisma.design.create({
            data: {
              key: parseInt(key),
              messageText,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });
        } else if (mobileNumber) {
          newDesign = await prisma.design.create({
            data: {
              key: parseInt(key),
              mobileNumber,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });
        } else if (req.file) {
          newDesign = await prisma.design.create({
            data: {
              key: parseInt(key),
              messageAudio: req.file.filename,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });
        }

        response.success(res, "Design created successfully!", newDesign);
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async designUpdatePatch(req, res) {
    try {
      const { key, messageText, mobileNumber } = req.body;

      const { designId } = req.params;

      // finding user from id
      const designFound = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (designFound) {
        const updatedDesign = await prisma.design.update({
          where: {
            id: parseInt(designId),
          },

          data: {
            key,
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

  async designRemoveDelete(req, res) {
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

module.exports = new DesignController();
