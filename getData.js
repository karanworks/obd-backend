const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const makeCall = require("./makeCall");

async function testFunction(channelNo) {
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
      console.log("NO ACTIVE CAMPAIGNS FOUND");

      return;
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

      // Step 3: Query the final data
      const data = await prisma.campaignDialingData.findMany({
        where: {
          id: {
            notIn: excludedCallerIds,
          },
        },
        take: channelNo,
      });

      if (data.length < 0) {
        console.log("MOBILE NUMBERS TO CALL ->", data.length);
        return;
      }

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
          channels: true,
        },
      });

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
          channelsCount: gatewayDetail.channels,
        };
      });

      if (result?.length) {
        return result;
      }
    }
  } catch (err) {
    console.error("Error in testFunction:", err);
  } finally {
    prisma.$disconnect();
  }
}

async function main() {
  let result = await testFunction(2);

  while (result?.length) {
    result = await testFunction(2); // Call testFunction again and wait for it to resolve

    if (result?.length) {
      const allCalls = result?.map((data) =>
        makeCall(
          data?.phoneNumber,
          `${data?.phoneNumber}<${data?.id}>`,
          data?.dialplanName,
          data?.id
        )
      );

      await Promise.all(allCalls);
    } else {
      break;
    }
  }

  console.log("No More Numbers To Dial");
}

main();
// async function testFunction() {
//   try {
//     // Step 1: Get the list of Campaign IDs that are active and have timeStart and timeEnd conditions
//     const activeCampaignIds = await prisma.campaignDataSetting
//       .findMany({
//         where: {
//           campaignId: {
//             in: (
//               await prisma.campaigns.findMany({
//                 where: {
//                   status: 1,
//                 },
//                 select: {
//                   id: true,
//                 },
//               })
//             ).map((campaign) => campaign.id), // Flattening the array to pass only campaign IDs
//           },
//           timeStart: {
//             lte: "13:00",
//           },
//           timeEnd: {
//             gte: "20:00",
//           },
//           workDays: {
//             contains: "6",
//           },
//         },
//         select: {
//           campaignId: true,
//         },
//       })
//       .then((results) => results.map((item) => item.campaignId)); // Flattening the array to pass only campaign IDs
//     if (activeCampaignIds.length === 0) {
//       console.log("NO ACTIVE CAMPAIGNS FOUND");

//       return;
//     } else {
//       // Step 2: Get callerIdNums that should be excluded
//       const excludedCallerIds = await prisma.callResponseCDR
//         .findMany({
//           where: {
//             calleridnum: {
//               in: (
//                 await prisma.campaignDialingData.findMany({
//                   where: {
//                     campaignId: {
//                       in: activeCampaignIds,
//                     },
//                   },
//                   select: {
//                     id: true,
//                   },
//                 })
//               ).map((campaignDialingData) => String(campaignDialingData.id)), // Flattening the array to pass only IDs
//             },
//           },
//           select: {
//             calleridnum: true,
//           },
//         })
//         .then((results) => results.map((item) => parseInt(item.calleridnum))); // Flattening the array to pass only calleridnums

//       // Step 3: Query the final data
//       const data = await prisma.campaignDialingData.findMany({
//         where: {
//           id: {
//             notIn: excludedCallerIds,
//           },
//         },
//         take: 1,
//       });

//       if (data.length < 0) {
//         console.log("MOBILE NUMBERS TO CALL ->", data.length);
//         return;
//       }

//       const campainDetails = await prisma.campaigns.findMany({
//         where: {
//           id: {
//             in: activeCampaignIds,
//           },
//         },
//         select: {
//           id: true,
//           dialplanName: true,
//           gatewayId: true,
//         },
//       });

//       const gatewayIds = campainDetails.map((campaign) =>
//         parseInt(campaign.gatewayId)
//       );

//       const gatewayDetails = await prisma.gateway.findMany({
//         where: {
//           id: {
//             in: gatewayIds,
//           },
//         },
//         select: {
//           id: true,
//           userId: true,
//           channels: true,
//         },
//       });

//       // Assuming `data` is the array of campaign dialing data you fetched earlier
//       const result = data.map((item) => {
//         const campaignDetail = campainDetails.find(
//           (detail) => detail.id === item.campaignId
//         );
//         const gatewayDetail = gatewayDetails.find(
//           (gateway) => gateway.id === parseInt(campaignDetail?.gatewayId)
//         );

//         return {
//           id: item.id,
//           phoneNumber: item.phoneNumber,
//           dialplanName: campaignDetail?.dialplanName,
//           GatewayID: gatewayDetail.userId,
//           channelsCount: gatewayDetail.channels,
//         };
//       });

//       if (result[0]) {
//         return result[0];
//       }
//     }
//   } catch (err) {
//     console.error("Error in testFunction:", err);
//   } finally {
//     prisma.$disconnect();
//   }
// }

// async function main() {
//   let result = await testFunction();

//   while (result) {
//     result = await testFunction(); // Call testFunction again and wait for it to resolve

//     if (result) {
//       await makeCall(
//         result?.phoneNumber,
//         `${result?.phoneNumber}<${result?.id}>`,
//         result?.dialplanName,
//         result?.id
//       );
//     } else {
//       break;
//     }
//   }

//   console.log("No More Numbers To Dial");
// }

// main();
