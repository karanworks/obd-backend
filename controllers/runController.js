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

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const campaignDataSettings =
          await prisma.campaignDataSetting.findMany();

        const data = await Promise.all(
          campaignDataSettings.map(async (campaignDataSetting) => {
            const campaign = await prisma.campaigns.findFirst({
              where: {
                id: parseInt(campaignDataSetting.campaignId),
              },
            });

            const totalData = await prisma.campaignDialingData.count({
              where: {
                campaignDataSettingId: campaignDataSetting.id,
              },
            });

            return {
              ...campaignDataSetting,
              totalData,
              campaignName: campaign.campaignName,
            };
          })
        );

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Designs fetched!", {
          ...adminDataWithoutPassword,
          campaignDataSettings: data,
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
      const { campaignId, date, startTime, endTime } = req.body;

      const { buffer } = req.file;

      const csvString = buffer.toString();

      const rows = csvString.trim().split("\n");
      rows.shift(); // removed the first element because that was header of csv column ("Mobile Numbers")

      const loggedInUser = await getLoggedInUser(req, res);
      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (loggedInUser) {
        const newCampaigningDataSetting =
          await prisma.campaignDataSetting.create({
            data: {
              campaignId: parseInt(campaignId),
              date,
              timeStart: startTime,
              timeEnd: endTime,
            },
          });

        const data = rows.map((row) => {
          const phoneNumber = row.trim(); // This removes the \r from the end
          return {
            phoneNumber: phoneNumber,
            campaignDataSettingId: newCampaigningDataSetting.id,
            campaignId: newCampaigningDataSetting.campaignId,
          };
        });

        // create record for each individual row (mobile number)
        const newCampaignDialingData =
          await prisma.campaignDialingData.createMany({
            data: data,
          });

        // Fetch newly created records
        const createdDialingData = await prisma.campaignDialingData.findMany({
          where: {
            campaignDataSettingId: newCampaigningDataSetting.id,
          },
        });

        // Create status for each created record
        const statusData = createdDialingData.map((dialingData) => ({
          campaignDialingDataId: dialingData.id,
        }));

        await prisma.campaignDialingDataStatus.createMany({
          data: statusData,
        });

        const campaignDataSetting = {
          ...newCampaigningDataSetting,
          campaignName: campaign.campaignName,
          totalData: newCampaignDialingData.count,
          pendingData: newCampaignDialingData.count, // because none of the number has been called yet because the setting has just been created
          testedData: 0,
        };

        response.success(res, "Run Created Successfully", campaignDataSetting);
      } else {
        response.error(res, "User not logged in");
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async runUpdatePatch(req, res) {
    try {
      const { date, startTime, endTime } = req.body;

      const { runId } = req.params;

      const runFound = await prisma.campaignDataSetting.findFirst({
        where: {
          id: parseInt(runId),
        },
      });

      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(runFound.campaignId),
        },
      });

      if (runFound) {
        const updatedRun = await prisma.campaignDataSetting.update({
          where: {
            id: runFound.id,
          },
          data: {
            date,
            timeStart: startTime,
            timeEnd: endTime,
          },
        });

        const totalData = await prisma.campaignDataSetting.count({
          where: {
            campaignId: parseInt(runFound.campaignId),
          },
        });

        response.success(res, "Run updated successfully!", {
          updatedRun: {
            ...updatedRun,
            campaignName: campaign.campaignName,
            totalData: totalData.count,
          },
        });
      } else {
        response.error(res, "Run not found!");
      }
    } catch (error) {
      console.log("error while updating run controller", error);
    }
  }

  async runRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { runId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const currentStatus = await prisma.campaignDataSetting.findFirst({
          where: {
            id: parseInt(runId),
          },
        });

        const campaign = await prisma.campaigns.findFirst({
          where: {
            id: parseInt(currentStatus.campaignId),
          },
        });

        const totalData = await prisma.campaignDataSetting.count({
          where: {
            campaignId: parseInt(currentStatus.campaignId),
          },
        });

        const removedCampaignDataSetting =
          await prisma.campaignDataSetting.update({
            where: {
              id: parseInt(runId),
            },
            data: {
              status: currentStatus.status === 0 ? 1 : 0,
            },
          });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Run removed!", {
          ...adminDataWithoutPassword,
          removedRun: {
            ...removedCampaignDataSetting,
            campaignName: campaign.campaignName,
            totalData: totalData.count,
          },
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
