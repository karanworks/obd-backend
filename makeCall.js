const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const AsteriskManager = require("asterisk-manager");

function createRandomVariableName(baseName) {
  const randomNum = Math.floor(Math.random() * 1000); // Generates a random number between 0 and 999
  return `${baseName}${randomNum}`;
}

function makeCall(destinationNumber, callerId, dialplan, cddId, gatewayName) {
  return new Promise((resolve, reject) => {
    const randomVariableName = createRandomVariableName("ami");

    const dynamicVariables = {};

    dynamicVariables[randomVariableName] = new AsteriskManager(
      5038,
      "localhost",
      "asteriskAdmin",
      "asteriskAdmin#13",
      true
    );

    const context = dialplan; // Context defined in extensions.conf
    const extension = destinationNumber;
    const priority = 1;

    dynamicVariables[randomVariableName].action(
      {
        Action: "Originate",
        Channel: `PJSIP/${extension}@${gatewayName}`, // Adjust for your trunk/channel
        Context: context,
        Exten: extension,
        Priority: priority,
        CallerID: callerId,
        Timeout: 30000, // Timeout in milliseconds
      },
      function (err, response) {
        if (err) {
          console.error("Error making call:", err);
          dynamicVariables[randomVariableName].disconnect(); // Disconnect on error
          reject(err);
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
        console.log("----------------NEW CALL MADE----------------");
      }

      if (event.event === "Hangup") {
        console.log("HANGUP EVENT ->", event);

        // Handle call hangup event
        const { channel, reason } = event;
        endTime = new Date();

        if (parseInt(event.connectedlinenum) === cddId) {
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
            .then(() => {
              // Successfully created CDR
            })
            .catch((err) => {
              console.log("UNIQUE ERROR ->", err);
            })
            .finally(() => {
              dynamicVariables[randomVariableName].disconnect(); // Disconnect after handling
              resolve(); // Resolve the promise when the operation is complete
            });
        } else {
          dynamicVariables[randomVariableName].disconnect(); // Disconnect if condition does not match
          resolve(); // Resolve if the condition does not match
        }
      }

      if (event.event === "Cdr") {
        prisma.cdr
          .create({
            data: {
              source: event.source,
              destination: event.destination,
              destinationContext: event.destinationcontext,
              callerId: event.callerid,
              channel: event.channel,
              destinationChannel: event.destinationchannel,
              lastApplication: event.lastapplication,
              lastData: event.lastdata,
              startTime: event.starttime,
              answerTime: event.answertime,
              endTime: event.endtime,
              duration: event.duration,
              billableSeconds: event.billableseconds,
              disposition: event.disposition,
              amaFlags: event.amaflags,
              uniqueId: event.uniqueid,
              userField: event.userfield,
            },
          })
          .then(() => {
            console.log("CDR REPORT CREATED ->", res);
          })
          .catch((err) => {
            console.log("THERE WAS ERROR WHILE CREATING CDR REPORT ->", err);
          });

        console.log("event CDR", event);
      }
    });

    // Handle errors
    dynamicVariables[randomVariableName].on("error", (err) => {
      console.error("AMI Error:", err);
      dynamicVariables[randomVariableName].disconnect(); // Disconnect on error
      reject(err);
    });
  });
}

module.exports = makeCall;
