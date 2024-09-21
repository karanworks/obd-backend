const { PrismaClient } = require("@prisma/client");
const AsteriskManager = require("asterisk-manager");

function makeCall(destinationNumber, callerId, dialplan, gatewayName) {
  const ami = new AsteriskManager(
    5038,
    "localhost",
    "asteriskAdmin",
    "asteriskAdmin#13",
    true
  );

  const context = dialplan; // Context defined in extensions.conf // DIALPLAN NAME (conf file name that is nothing but campaign name with underscore)
  const extension = destinationNumber;
  const priority = 1;

  ami.action(
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
        console.error("Error making call:", err, response);
        // reject(err); // Properly handle the error by rejecting the promise
      } else {
        console.log("Call initiated:", response);
      }
    }
  );

  // AMI EVENT
  ami.on("managerevent", (event) => {
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
    }
  });

  // Handle errors
  ami.on("error", (err) => {
    console.error("AMI Error:", err);
  });
}

module.exports = { makeCall };
