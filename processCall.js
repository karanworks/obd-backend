const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const makeCall = require("./makeCall");

const getCampaignPhoneNumbers = require("./getCampaignsPhoneNumbers");

async function processCall() {
  let campaignPhoneNumbers = await getCampaignPhoneNumbers();

  const phoneNumbers = campaignPhoneNumbers?.phoneNumbers;

  if (!campaignPhoneNumbers) {
    setTimer();
    return;
  }

  for (
    let i = 0;
    i < phoneNumbers?.length;
    i += campaignPhoneNumbers.channels
  ) {
    const numberToCall = phoneNumbers.splice(0, campaignPhoneNumbers.channels);

    await Promise.all(
      numberToCall.map((number) =>
        makeCall(
          number.phoneNumber,
          `${number.phoneNumber}<${number.id}>`,
          campaignPhoneNumbers.campaign.dialplanName,
          number.id
        )
      )
    );

    const completedNumberIds = numberToCall?.map((number) => number.id);

    await prisma.campaignDialingData.updateMany({
      where: {
        id: {
          in: completedNumberIds,
        },
      },
      data: {
        status: "Completed",
      },
    });
  }

  await prisma.campaignDataSetting.update({
    where: {
      id: campaignPhoneNumbers?.campaignSettingId,
    },
    data: {
      status: 0,
    },
  });

  // console.log("PHONE NUMBERS ->", campaignPhoneNumbers);

  await processCall();
}
processCall();

function setTimer() {
  console.log("-----------------PROCESSING CALL AGAIN-----------------");
  setTimeout(() => {
    processCall();
  }, 5000);
}
