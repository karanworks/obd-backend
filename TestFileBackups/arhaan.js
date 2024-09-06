const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getCampaignDialingData() {
  try {
    // Step 1: Get the list of Campaign IDs that are active and have timeStart and timeEnd conditions
    const activeCampaignIds = await prisma.campaignDataSetting
      .findMany({
        where: {
          campaignId: {
            in: (
              await prisma.campaigns.findMany({
                where: {
                  status: 1,
                },
                select: {
                  id: true,
                },
              })
            ).map((campaign) => campaign.id), // Flattening the array to pass only campaign IDs
          },
          timeStart: {
            lte: "13:00",
          },
          timeEnd: {
            gte: "20:00",
          },
          workDays: {
            contains: "6",
          },
        },
        select: {
          campaignId: true,
        },
      })
      .then((results) => results.map((item) => item.campaignId)); // Flattening the array to pass only campaign IDs
    if (activeCampaignIds.length === 0) {
      console.log("No campaign data found to process.");
    } else {
      // Step 2: Get callerIdNums that should be excluded
      const excludedCallerIds = await prisma.callResponseCDR
        .findMany({
          where: {
            calleridnum: {
              in: (
                await prisma.campaignDialingData.findMany({
                  where: {
                    campaignId: {
                      in: activeCampaignIds,
                    },
                  },
                  select: {
                    id: true,
                  },
                })
              ).map((campaignDialingData) => String(campaignDialingData.id)), // Flattening the array to pass only IDs
            },
          },
          select: {
            calleridnum: true,
          },
        })
        .then((results) => results.map((item) => parseInt(item.calleridnum))); // Flattening the array to pass only calleridnums
      // console.log(excludedCallerIds);
      // Step 3: Query the final data
      const data = await prisma.campaignDialingData.findMany({
        where: {
          id: {
            notIn: excludedCallerIds, //excludedCallerIds,
          },
        },
      });

      const campainDetails = await prisma.campaigns.findMany({
        where: {
          id: {
            in: activeCampaignIds,
          },
        },
        select: {
          id: true,
          dialplanName: true,
          gatewayId: true,
        },
      });

      //  console.log(campainDetails);

      const gatewayIds = campainDetails.map((campaign) =>
        parseInt(campaign.gatewayId)
      );

      const gatewayDetails = await prisma.gateway.findMany({
        where: {
          id: {
            in: gatewayIds,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      // console.log(gatewayDetails);

      // Assuming `data` is the array of campaign dialing data you fetched earlier
      const result = data.map((item) => {
        const campaignDetail = campainDetails.find(
          (detail) => detail.id === item.campaignId
        );
        const gatewayDetail = gatewayDetails.find(
          (gateway) => gateway.id === parseInt(campaignDetail?.gatewayId)
        );

        return {
          id: item.id,
          phoneNumber: item.phoneNumber,
          dialplanName: campaignDetail?.dialplanName,
          GatewayID: gatewayDetail.userId,
        };
      });

      console.log(result);
    }
    // console.log(result);
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getCampaignDialingData();
