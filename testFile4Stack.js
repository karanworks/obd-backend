const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const mysql = require("mysql");
const AsteriskManager = require("asterisk-manager");

function createRandomVariableName(baseName) {
  const randomNum = Math.floor(Math.random() * 1000); // Generates a random number between 0 and 999
  return `${baseName}${randomNum}`;
}

function makeCall(destinationNumber, callerId, dialplan, cddId) {
  return new Promise((resolve, reject) => {
    const randomVariableName = createRandomVariableName("ami");

    const dynamicVariables = {};

    dynamicVariables[randomVariableName] = new AsteriskManager(
      5038,
      "localhost",
      "admin",
      "arhaan",
      true
    );

    const context = dialplan; // Context defined in extensions.conf // DIALPLAN NAME (conf file name that is nothing but campaign name with underscore)
    const extension = destinationNumber;
    const priority = 1;

    dynamicVariables[randomVariableName].action(
      {
        Action: "Originate",
        Channel: `PJSIP/${extension}@gt206`, // Adjust for your trunk/channel
        Context: context,
        Exten: extension,
        Priority: priority,
        CallerID: callerId,
        Timeout: 30000, // Timeout in milliseconds
      },
      function (err, response) {
        if (err) {
          console.error("Error making call:", err);
          // reject(err); // Properly handle the error by rejecting the promise
        } else {
          console.log("Call initiated:", response);
        }
      }
    );

    let startTime;
    let endTime;

    // AMI EVENT
    dynamicVariables[randomVariableName].on("managerevent", (event) => {
      if (event.event === "Newchannel") {
        // Handle new call event

        startTime = new Date();
        console.log("New call:", event);
      }

      if (event.event === "CDR") {
        console.log("event CDR");
      }

      if (event.event === "Hangup") {
        // Handle call hangup event
        const { channel, reason } = event;
        endTime = new Date();

        if (parseInt(event.connectedlinenum) === cddId) {
          console.log("EVENT ERROR CHECK ->", event.uniqueid);

          prisma.callResponseCDR
            .create({
              data: {
                eventName: event.event,
                privilege: event.privilege,
                channelId: event.channel,
                channelState: event.channelstate,
                channelStateDesc: event.channelstatedesc,
                calleridnum: event.calleridnum,
                calleridname: event.calleridname,
                connectedlinenum: event.connectedlinenum,
                connectedlinename: event.connectedlinename,
                language: event.language,
                accountcode: event.accountcode,
                context: event.context,
                exten: event.exten,
                priority: event.priority,
                uniqueid: event.uniqueid,
                linkedid: event.linkedid,
                cause: event.cause,
                causeTxt: event["cause-txt"],
                startTime,
                endTime,
              },
            })
            .then((res) => {
              console.log("CDR CREATED!", event);
            })
            .catch((err) => {
              console.log("UNIQUE ERROR ->", err);
            })
            .finally(() => {
              resolve(); // Resolve the promise when the operation is complete
            });
        } else {
          resolve(); // Resolve if the condition does not match
        }
      }
    });

    // Handle errors
    dynamicVariables[randomVariableName].on("error", (err) => {
      console.error("AMI Error:", err);
      reject(err); // Properly handle errors by rejecting the promise
    });
  });
}

async function generateCall() {
  try {
    // Function to process a batch of calls
    async function processCalls(batch) {
      const callPromises = batch.map((numberToCall) => {
        if (numberToCall?.phoneNumber) {
          return makeCall(
            numberToCall.phoneNumber,
            `${numberToCall.phoneNumber}<${numberToCall?.id}>`,
            numberToCall.dialplanName,
            numberToCall.id
          );
        }
      });

      await Promise.allSettled(callPromises);
    }

    const batch = await getNumbersToCall(2);

    while (batch.length) {
      await processCalls(batch);
      console.log("BATCH HERE", batch);
    }
  } catch (err) {
    console.error("Error in generateCall function:", err);
  } finally {
    prisma.$disconnect();
  }
}

generateCall().catch((err) => {
  console.error("Unhandled error in generateCall function:", err);
});

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

async function getNumbersToCall(channelNo) {
  try {
    const [time, day] = getCurrentTime();

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
            lte: time,
          },
          timeEnd: {
            gte: time,
          },
          workDays: {
            contains: day,
          },
        },
        select: {
          campaignId: true,
        },
      })
      .then((results) => results.map((item) => item.campaignId));

    if (activeCampaignIds.length === 0) {
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
        .then((results) => results.map((item) => parseInt(item.calleridnum)));

      // Step 3: Query the final data
      const data = await prisma.campaignDialingData.findMany({
        where: {
          id: {
            notIn: excludedCallerIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: channelNo, // CHANNEL NO NEEDS TO BE MODIFIED HERE
      });

      if (data.length === 0) {
        return;
      }

      const campaignDetails = await prisma.campaigns.findMany({
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

      const gatewayIds = campaignDetails.map((campaign) =>
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

      const result = data.map((item) => {
        const campaignDetail = campaignDetails.find(
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

      return result;
    }
  } catch (err) {
    console.error("Error in getNumbersToCall:", err);
  }
}
