const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class DesignController {
  constructor() {
    this.designsGet = this.designsGet.bind(this);
    this.designCreatePost = this.designCreatePost.bind(this);
    this.designUpdatePatch = this.designUpdatePatch.bind(this);
    this.designRemoveDelete = this.designRemoveDelete.bind(this);
    this.writeFile = this.writeFile.bind(this);
  }

  async designsGet(req, res) {
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

  async designCreatePost(req, res) {
    try {
      const { key, messageText, mobileNumber, campaignId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      const baseUrl = "http://localhost:3008/audio";

      const designAlreadyExistOnKey = await prisma.design.findFirst({
        where: {
          key,
          status: 1,
          campaignId: parseInt(campaignId),
        },
      });

      if (designAlreadyExistOnKey) {
        response.error(
          res,
          "Design already exist for this key!",
          designAlreadyExistOnKey
        );
      }

      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (loggedInUser) {
        let newDesign;

        if (messageText) {
          newDesign = await prisma.design.create({
            data: {
              key,
              messageText,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });

          this.writeFile(key, "Text", messageText, campaign.campaignName);
        } else if (mobileNumber) {
          newDesign = await prisma.design.create({
            data: {
              key,
              mobileNumber,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });
          this.writeFile(
            key,
            "Mobile Number",
            mobileNumber,
            campaign.campaignName
          );
        } else if (req.file) {
          newDesign = await prisma.design.create({
            data: {
              key,
              messageAudio: `${baseUrl}/${req.file.filename}`,

              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });

          this.writeFile(
            key,
            "Audio",
            req.file.filename,
            campaign.campaignName
          );
        }

        response.success(res, "Design created successfully!", newDesign);
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async designUpdatePatch(req, res) {
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

  writeFile(key, designType, designMessage, campaignName) {
    const lines = [
      "",
      `exten => 1,1,noOp("Presses ${key}")`,
      `${
        designType === "Text"
          ? `same => n,agi(googletts.agi,"${designMessage}",en)\nsame => n,Hangup()`
          : designType === "Audio"
          ? `same => n,Background(uploads/${designMessage})\nsame => n,Hangup()`
          : designType === "Mobile Number"
          ? 'same => n,agi(googletts.agi,"Please wait , while we are connecting your call to Agent",en)\n`same => n,Gosub(dial-gsm,s,1,(${designMessage}))`'
          : ""
      }`,
    ];

    lines.forEach((line) => {
      fs.appendFileSync(
        `conf/${campaignName.split(" ").join("_")}.conf`,
        line + "\n",
        "utf8",
        (err) => {
          if (err) {
            console.error("Error creating or writing to file:", err);
          } else {
            console.log("File created and written successfully.");
          }
        }
      );
    });
  }
}

module.exports = new DesignController();
