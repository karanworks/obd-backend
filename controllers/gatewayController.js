const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class GatewayController {
  async gatewayGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const gateways = await prisma.gateway.findMany({});

        const gatewaysWithCampaign = await Promise.all(
          gateways?.map(async (gateway) => {
            const campaign = await prisma.campaigns.findFirst({
              where: {
                id: gateway.campaignid,
              },
            });

            return {
              ...gateway,
              campaignName: campaign.campaignName,
            };
          })
        );

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Designs fetched!", {
          ...adminDataWithoutPassword,
          gateways: gatewaysWithCampaign,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting gateway", error);
    }
  }

  async gatewayCreatePost(req, res) {
    try {
      const { gatewayIpAddress, channels, userId, password, campaignId } =
        req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const campaign = await prisma.campaigns.findFirst({
          where: { id: parseInt(campaignId) },
        });

        const gateway = await prisma.gateway.create({
          data: {
            gatewayIpAddress,
            channels: parseInt(channels),
            userId,
            password,
            campaignId: parseInt(campaignId),
          },
        });

        response.success(res, "Gateway Created Successfully", {
          ...gateway,
          campaignName: campaign.campaignName,
        });
      } else {
        response.error(res, "User not logged in");
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async gatewayUpdatePatch(req, res) {
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

        const totalData = await prisma.campaignDialingData.count({
          where: {
            campaignId: parseInt(runFound.campaignId),
          },
        });

        // pending data count
        const pendingData = await campaignDialingData.reduce(
          async (prevPromise, data) => {
            const prev = await prevPromise; // Wait for the previous promise to resolve
            const status = await prisma.campaignDialingDataStatus.findFirst({
              where: {
                campaignDialingDataId: data.id,
              },
            });

            return prev + (status.status === 1 ? 1 : 0); // Add 1 if status is 1, otherwise add 0
          },
          Promise.resolve(0)
        );

        response.success(res, "Run updated successfully!", {
          updatedRun: {
            ...updatedRun,
            campaignName: campaign.campaignName,
            totalData,
            pendingData,
          },
        });
      } else {
        response.error(res, "Run not found!");
      }
    } catch (error) {
      console.log("error while updating run controller", error);
    }
  }

  async gatewayRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { gatewayId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const currentStatus = await prisma.gateway.findFirst({
          where: {
            id: parseInt(gatewayId),
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        if (currentStatus.status === 0) {
          const updatedGateway = await prisma.gateway.update({
            where: {
              id: currentStatus.id,
            },
            data: {
              status: 1,
            },
          });

          response.success(res, "Gateway status updated!", {
            ...adminDataWithoutPassword,
            updatedGateway,
          });
        } else {
          const updatedGateway = await prisma.gateway.update({
            where: {
              id: currentStatus.id,
            },
            data: {
              status: 0,
            },
          });

          response.success(res, "Gateway status updated!", {
            ...adminDataWithoutPassword,
            updatedGateway,
          });
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing gateway", error);
    }
  }
}

module.exports = new GatewayController();
