const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const makeCall = require("./makeCall");

const getCampaignPhoneNumbers = require("./getCampaignsPhoneNumbers");

let stopCalling = false;

function handleStopCalling() {
  stopCalling = true;
}
function handleResumeCalling() {
  stopCalling = false;
}

async function processCall() {
  console.log("STOP CALL IN PROCESS CALL ->", stopCalling);

  if (stopCalling) {
    return;
  }

  console.log("PROCESS CALL CALLED ");

  let campaignPhoneNumbers = await getCampaignPhoneNumbers();

  const phoneNumbers = campaignPhoneNumbers?.phoneNumbers && [
    ...campaignPhoneNumbers?.phoneNumbers,
  ];

  if (!campaignPhoneNumbers) {
    setTimer();
    return;
  }

  // temporary storing length for loop
  const tempLength = campaignPhoneNumbers?.phoneNumbers?.length;

  for (let i = 0; i < tempLength; i += campaignPhoneNumbers?.channels) {
    if (stopCalling) {
      return;
    }

    const numberToCall = phoneNumbers.splice(0, campaignPhoneNumbers?.channels);

    await Promise.all(
      numberToCall.map((number) =>
        makeCall(
          number.phoneNumber,
          `${number.phoneNumber}<${number.id}>`,
          campaignPhoneNumbers?.campaign.dialplanName,
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

function setTimer() {
  console.log("-----------------PROCESSING CALL AGAIN-----------------");
  setTimeout(() => {
    processCall();
  }, 5000);
}

module.exports = {
  processCall,
  setTimer,
  handleStopCalling,
  handleResumeCalling,
};
