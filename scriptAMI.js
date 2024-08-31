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

// Asterisk AMI connection setup
const ami = new AsteriskManager(5038, "localhost", "admin", "arhaan", true);

// Function to make an outbound call
function makeCall(destinationNumber, callerId) {
  const context = "obd-setup"; // Context defined in extensions.conf // DIALPLAN NAME (conf file name that is nothing but campaign name with underscore)
  const extension = destinationNumber;
  const priority = 1;

  ami.action(
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
}

// Example usage: Make a call to 1234567890 with CallerID 0987654321
makeCall("9716909086", "gt206<FromGSM>");

// Listen for new calls
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
    // Insert into MySQL
    const query =
      "INSERT INTO asterisk_cdr (call_id, src, dst, start_time, end_time, duration, disposition) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const values = [
      channel, // Call ID
      event.callerid, // Source
      event.extension, // Destination
      event.starttime, // Start time
      new Date(), // End time
      event.duration, // Duration
      reason, // Disposition
    ];
    db.query(query, values, (err, result) => {
      if (err) throw err;
      console.log("Call logged to MySQL", event);
    });
  }
});

// Handle errors
ami.on("error", (err) => {
  console.error("AMI Error:", err);
});

// Keep the script running
process.on("SIGINT", () => {
  ami.disconnect();
  db.end();
  process.exit();
});
