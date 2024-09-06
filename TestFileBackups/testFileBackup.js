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
function makeCall2(destinationNumber, callerId, dialplan, cddId) {
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
      // Insert into MySQL
      // const query =
      //   "INSERT INTO asterisk_cdr (call_id, src, dst, start_time, end_time, duration, disposition) VALUES (?, ?, ?, ?, ?, ?, ?)";

      const recordInsert = prisma.callResponseCDR
        .create({
          data: {
            cddId,
            phoneNumber: destinationNumber,
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
          // console.log("CDR CREATED!", event);
        });

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
  const pendingMobileNos = await prisma.campaignDialingDataStatus.findMany({
    where: {
      status: 1,
    },
  });

  // filtering only ids of campaignDialingData
  const campaignDialingData = await Promise.all(
    pendingMobileNos.map(async (data) => {
      const campaignDialingData = await prisma.campaignDialingData.findFirst({
        where: {
          id: data.campaignDialingDataId,
        },
      });

      const campaignDataSetting = await prisma.campaignDataSetting.findFirst({
        where: {
          id: parseInt(campaignDialingData.campaignDataSettingId),
        },
      });

      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: campaignDataSetting.campaignId,
        },
      });

      return {
        id: data.campaignDialingDataId,
        confFileName: campaign.campaignName.replace(/\s+/g, "_"),
        campaignName: campaign.campaignName,
      };
    })
  );

  // filtering mobile numbers from campaignDialingData
  const mobileNumbersArray = await Promise.all(
    campaignDialingData.map(async (data) => {
      const mobileNoData = await prisma.campaignDialingData.findFirst({
        where: {
          id: data.id,
        },
      });

      return {
        phoneNumber: mobileNoData.phoneNumber,
        confFileName: data.confFileName,
        cddId: data.id,
      };
    })
  );

  makeCall(
    mobileNumbersArray[0]?.phoneNumber,
    `${mobileNumbersArray[0]?.phoneNumber}<${mobileNumbersArray[0]?.cddId}>`,
    mobileNumbersArray[0]?.confFileName,
    mobileNumbersArray[0]?.cddId
  );
  makeCall(
    mobileNumbersArray[1]?.phoneNumber,
    `${mobileNumbersArray[1]?.phoneNumber}<${mobileNumbersArray[1]?.cddId}>`,
    mobileNumbersArray[1]?.confFileName,
    mobileNumbersArray[1]?.cddId
  );
  makeCall(
    mobileNumbersArray[2]?.phoneNumber,
    `${mobileNumbersArray[2]?.phoneNumber}<${mobileNumbersArray[2]?.cddId}>`,
    mobileNumbersArray[2]?.confFileName,
    mobileNumbersArray[2]?.cddId
  );
  makeCall(
    mobileNumbersArray[3]?.phoneNumber,
    `${mobileNumbersArray[3]?.phoneNumber}<${mobileNumbersArray[3]?.cddId}>`,
    mobileNumbersArray[3]?.confFileName,
    mobileNumbersArray[3]?.cddId
  );
}
testFunction();
