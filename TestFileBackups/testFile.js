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
          console.log("YES CONDITION BEING EXECUTED");

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

async function testFunction() {
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
      });

      if (data.length > 0) {
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
        };
      });

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

        await Promise.all(callPromises); // Use Promise.allSettled to ensure all promises are handled
      }

      // Process calls in batches of 2
      while (result.length > 0) {
        const batch = result.splice(0, 2); // Get the next batch of 2 calls
        await processCalls(batch);
      }
    }
  } catch (err) {
    console.error("Error in testFunction:", err);
  } finally {
    prisma.$disconnect();
  }
}

testFunction().catch((err) => {
  console.error("Unhandled error in testFunction:", err);
});
