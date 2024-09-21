const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getCampaignPhoneNumbers() {
  const [time, day] = getCurrentTime();

  const activeCampaignSetting = await prisma.campaignDataSetting.findFirst({
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
        lte: time,
      },
      timeEnd: {
        gte: time,
      },
      workDays: {
        contains: day,
      },
      status: 1,
    },
  });

  if (activeCampaignSetting) {
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: activeCampaignSetting.campaignId,
      },
    });
    const phoneNumbers = await prisma.campaignDialingData.findMany({
      where: {
        status: "Pending",
        campaignId: activeCampaignSetting.campaignId,
      },
    });

    const gateway = await prisma.gateway.findFirst({
      where: { id: parseInt(campaign.gatewayId) },
    });

    return {
      campaign,
      channels: gateway.channels,
      gatewayName: gateway.userId,
      phoneNumbers,
      campaignSettingId: activeCampaignSetting.id,
    };
  } else {
    return null;
  }
}

getCampaignPhoneNumbers();

function getCurrentTime() {
  const date = new Date();
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: false,
  };
  const time = date.toLocaleTimeString("en-GB", options);
  const day = date.getDay().toString();

  return [time, day];
}

module.exports = getCampaignPhoneNumbers;
