const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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

module.exports = makeCall;
