const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class CampaignsController {
  async campaignsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const campaigns = await prisma.campaigns.findMany({});

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Campaigns fetched!", {
          ...adminDataWithoutPassword,
          campaigns,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting campaigns", error);
    }
  }

  async campaignCreatePost(req, res) {
    try {
      const {
        campaignName,
        channels,
        welcomeMessageText,
        invalidMessageText,
        timeOutMessageText,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const newCampaign = await prisma.campaigns.create({
          data: {
            campaignName,
            channels,
            welcomeMessageText,
            invalidMessageText,
            timeOutMessageText,
            status: 1,
            addedBy: loggedInUser.id,
          },
        });

        response.success(res, "Campaign registered successfully!", newCampaign);
      }
    } catch (error) {
      console.log("error while campaign registration ->", error);
    }
  }

  async campaignUpdatePatch(req, res) {
    try {
      const {
        campaignName,
        channels,
        welcomeMessageText,
        invalidMessageText,
        timeOutMessageText,
        status,
      } = req.body;

      const { campaignId } = req.params;

      // finding user from id
      const campaignFound = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (campaignFound) {
        if (status === 0 || status === 1) {
          const updatedCampaign = await prisma.campaigns.update({
            where: {
              id: parseInt(teamId),
            },

            data: {
              status,
            },
          });

          response.success(res, "Campaigns removed successfully!", {
            updatedCampaign,
          });
        } else {
          // update the details in user table as well
          const campaignToBeUpdated = await prisma.campaigns.findFirst({
            where: {
              id: campaignFound.id,
            },
          });

          const updatedTeam = await prisma.campaigns.update({
            where: {
              id: parseInt(teamId),
            },

            data: {
              teamName,
              email: email.toLowerCase(),
              password,
            },
          });

          response.success(res, "Campaign updated successfully!", {
            updatedTeam,
          });
        }
      } else {
        response.error(res, "campaign not found!");
      }
    } catch (error) {
      console.log("error while updating team controller", error);
    }
  }
}

module.exports = new CampaignsController();
