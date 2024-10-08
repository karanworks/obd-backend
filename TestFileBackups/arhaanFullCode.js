const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const mysql = require("mysql");
const AsteriskManager = require("asterisk-manager");

// MySQL connection setup
const db = mysql.createConnection({
  host: "192.168.1.200",
  user: "root",
  password: "King42kash@13",
  database: "asterisk",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

function createRandomVariableName(baseName) {
  const randomNum = Math.floor(Math.random() * 1000); // Generates a random number between 0 and 999
  return `${baseName}${randomNum}`;
}

function makeCall(destinationNumber, callerId, dialplan, cddId) {
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
      } else {
        console.log("Call initiated:", response);
      }
    }
  );

  //AMI EVENT
  dynamicVariables[randomVariableName].on("managerevent", (event) => {
    if (event.event === "Newchannel") {
      // Handle new call event
      console.log("New call:", event);
    }

    if (event.event === "CDR") {
      console.log("event CDR");
    }

    if (event.event === "Hangup") {
      // Handle call hangup event
      const { channel, reason } = event;

      if (parseInt(event.connectedlinenum) === cddId) {
        const recordInsert = prisma.callResponseCDR
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
            },
          })
          .then((res) => {
            console.log("CDR CREATED!", event);
          })
          .catch((err) => {
            console.log("UNIQU ERROR ->", err);
          });
      }

      // const values = [
      //   channel, // Call ID
      //   event.callerid, // Source
      //   event.extension, // Destination
      //   event.starttime, // Start time
      //   new Date(), // End time
      //   event.duration, // Duration
      //   reason, // Disposition
      // ];
      // db.query(query, values, (err, result) => {
      //   if (err) throw err;
      //   console.log("Call logged to MySQL", event);
      // });
    }
  });

  // Handle errors
  dynamicVariables[randomVariableName].on("error", (err) => {
    console.error("AMI Error:", err);
  });

  // Keep the script running
  process.on("SIGINT", () => {
    dynamicVariables[randomVariableName].disconnect();
    db.end();
    process.exit();
  });
}

async function testFunction() {
  // Checking whether number has already been called or not (in future status will be replaced by something else)

  //ACTIVE CAMPAIGNS
  const activeCampaigns = await prisma.campaigns.findMany({
    where: {
      status: 1,
    },
  });

  const activeCampaignsIds = activeCampaigns.map((campaign) => {
    return campaign.id;
  });

  const today = new Date();
  const dayOfWeek = today.getDay();

  const currentTime = new Date();
  const timeIn24HourFormat = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata", // Specify IST timezone
  }).format(currentTime);

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

  /////////////////////
  /// PARTITIONNNN ///
  ///////////////////

  // const pendingMobileNos = await prisma.campaignDialingDataStatus.findMany({
  //   where: {
  //     status: 1,
  //   },
  // });

  // // filtering only ids of campaignDialingData
  // const campaignDialingData = await Promise.all(
  //   pendingMobileNos.map(async (data) => {
  //     const campaignDialingData = await prisma.campaignDialingData.findFirst({
  //       where: {
  //         id: data.campaignDialingDataId,
  //       },
  //     });

  //     const campaignDataSetting = await prisma.campaignDataSetting.findFirst({
  //       where: {
  //         id: parseInt(campaignDialingData.campaignDataSettingId),
  //       },
  //     });

  //     const campaign = await prisma.campaigns.findFirst({
  //       where: {
  //         id: campaignDataSetting.campaignId,
  //       },
  //     });

  //     return {
  //       id: data.campaignDialingDataId,
  //       confFileName: campaign.campaignName.replace(/\s+/g, "_"),
  //       campaignName: campaign.campaignName,
  //     };
  //   })
  // );

  // // filtering mobile numbers from campaignDialingData
  // const mobileNumbersArray = await Promise.all(
  //   campaignDialingData.map(async (data) => {
  //     const mobileNoData = await prisma.campaignDialingData.findFirst({
  //       where: {
  //         id: data.id,
  //       },
  //     });

  //     return {
  //       phoneNumber: mobileNoData.phoneNumber,
  //       confFileName: data.confFileName,
  //       cddId: data.id,
  //     };
  //   })
  // );

  // makeCall(
  //   mobileNumbersArray[0]?.phoneNumber,
  //   `${mobileNumbersArray[0]?.phoneNumber}<${mobileNumbersArray[0]?.cddId}>`,
  //   mobileNumbersArray[0]?.confFileName,
  //   mobileNumbersArray[0]?.cddId
  // );
  // makeCall(
  //   mobileNumbersArray[1]?.phoneNumber,
  //   `${mobileNumbersArray[1]?.phoneNumber}<${mobileNumbersArray[1]?.cddId}>`,
  //   mobileNumbersArray[1]?.confFileName,
  //   mobileNumbersArray[1]?.cddId
  // );
  // makeCall(
  //   mobileNumbersArray[2]?.phoneNumber,
  //   `${mobileNumbersArray[2]?.phoneNumber}<${mobileNumbersArray[2]?.cddId}>`,
  //   mobileNumbersArray[2]?.confFileName,
  //   mobileNumbersArray[2]?.cddId
  // );
  // makeCall(
  //   mobileNumbersArray[3]?.phoneNumber,
  //   `${mobileNumbersArray[3]?.phoneNumber}<${mobileNumbersArray[3]?.cddId}>`,
  //   mobileNumbersArray[3]?.confFileName,
  //   mobileNumbersArray[3]?.cddId
  // );
}
testFunction();
