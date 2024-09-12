const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");
const {
  processCall,
  handleStopCalling,
  handleResumeCalling,
} = require("../processCall");

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

            const campaignDialingData =
              await prisma.campaignDialingData.findMany({
                where: {
                  campaignDataSettingId: campaignDataSetting.id,
                },
              });

            // pending data count
            // const pendingData = await campaignDialingData?.reduce(
            //   async (prevPromise, data) => {
            //     const prev = await prevPromise; // Wait for the previous promise to resolve
            //     const status = await prisma.campaignDialingDataStatus.findFirst(
            //       {
            //         where: {
            //           campaignDialingDataId: data.id,
            //         },
            //       }
            //     );

            //     return prev + (status?.status === 1 ? 1 : 0); // Add 1 if status is 1, otherwise add 0
            //   },
            //   Promise.resolve(0)
            // );

            const pendingData = await prisma.campaignDialingData.count({
              where: {
                campaignDataSettingId: campaignDataSetting.id,
                campaignId: campaign.id,
                status: "Pending",
              },
            });
            const testedData = await prisma.campaignDialingData.count({
              where: {
                campaignDataSettingId: campaignDataSetting.id,
                campaignId: campaign.id,
                status: "Completed",
              },
            });

            return {
              ...campaignDataSetting,
              totalData: campaignDialingData.length,
              campaignName: campaign.campaignName,
              pendingData,
              testedData,
            };
          })
        );

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Runs fetched!", {
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
      console.log("error while getting runs", error);
    }
  }

  async runCreatePost(req, res) {
    try {
      const { campaignId, date, startTime, endTime, workDays } = req.body;
      const { buffer } = req.file;
      const csvString = buffer.toString();
      const rows = csvString.trim().split("\n");
      rows.shift(); // Remove header row

      const loggedInUser = await getLoggedInUser(req, res);
      const campaign = await prisma.campaigns.findFirst({
        where: { id: parseInt(campaignId) },
      });

      if (loggedInUser) {
        const newCampaigningDataSetting =
          await prisma.campaignDataSetting.create({
            data: {
              campaignId: parseInt(campaignId),
              date,
              timeStart: startTime,
              timeEnd: endTime,
              workDays,
            },
          });

        const data = rows.map((row) => ({
          phoneNumber: row.trim(), // Removes the \r from the end
          campaignDataSettingId: newCampaigningDataSetting.id,
          campaignId: newCampaigningDataSetting.campaignId,
        }));

        // Create record for each individual row (mobile number)
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

        // Only call processCall if dialing data was successfully created
        if (createdDialingData.length > 0) {
          processCall(); // Start calling on this data

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
            pendingData: newCampaignDialingData.count,
            testedData: 0,
          };

          console.log(
            "UPDATED RUN AFTER UPLOADING NUMBERS ->",
            campaignDataSetting
          );

          response.success(
            res,
            "Run Created Successfully",
            campaignDataSetting
          );
        } else {
          response.error(res, "No dialing data created");
        }
      } else {
        response.error(res, "User not logged in");
      }
    } catch (error) {
      console.log("Error while creating the run ->", error);
      response.error(res, "Error occurred");
    }
  }

  async runUpdatePatch(req, res) {
    try {
      const { startTime, endTime, workDays } = req.body;

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
            timeStart: startTime,
            timeEnd: endTime,
            workDays,
          },
        });

        const totalData = await prisma.campaignDialingData.count({
          where: {
            campaignId: parseInt(runFound.campaignId),
          },
        });

        const pendingData = await prisma.campaignDialingData.count({
          where: {
            campaignDataSettingId: updatedRun.id,
            campaignId: updatedRun.campaignId,
            status: "Pending",
          },
        });
        const testedData = await prisma.campaignDialingData.count({
          where: {
            campaignDataSettingId: updatedRun.id,
            campaignId: updatedRun.campaignId,
            status: "Completed",
          },
        });

        // pending data count
        // const pendingData = await campaignDialingData.reduce(
        //   async (prevPromise, data) => {
        //     const prev = await prevPromise; // Wait for the previous promise to resolve
        //     const status = await prisma.campaignDialingDataStatus.findFirst({
        //       where: {
        //         campaignDialingDataId: data.id,
        //       },
        //     });

        //     return prev + (status.status === 1 ? 1 : 0); // Add 1 if status is 1, otherwise add 0
        //   },
        //   Promise.resolve(0)
        // );

        response.success(res, "Run updated successfully!", {
          updatedRun: {
            ...updatedRun,
            campaignName: campaign.campaignName,
            totalData,
            pendingData,
            testedData,
          },
        });
      } else {
        response.error(res, "Run not found!");
      }
    } catch (error) {
      console.log("error while updating run controller", error);
    }
  }

  // TO ACTIVATE OR DEACTIVATE RUN
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

        const totalData = await prisma.campaignDialingData.count({
          where: {
            campaignDataSettingId: parseInt(currentStatus.id),
          },
        });

        const pendingData = await prisma.campaignDialingData.count({
          where: {
            campaignDataSettingId: currentStatus.id,
            campaignId: campaign.id,
            status: "Pending",
          },
        });
        const testedData = await prisma.campaignDialingData.count({
          where: {
            campaignDataSettingId: currentStatus.id,
            campaignId: campaign.id,
            status: "Completed",
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

        if (removedCampaignDataSetting.status === 1) {
          handleResumeCalling();
          processCall();
        } else if (removedCampaignDataSetting.status === 0) {
          handleStopCalling();
        }

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Run removed!", {
          ...adminDataWithoutPassword,
          removedRun: {
            ...removedCampaignDataSetting,
            campaignName: campaign.campaignName,
            totalData: totalData,
            pendingData,
            testedData,
          },
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing run", error);
    }
  }
}

module.exports = new RunController();
