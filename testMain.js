const mysql = require("mysql2");
const AsteriskManager = require("asterisk-manager");

// MySQL connection configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "King42kash@13",
  database: "obd3",
});

function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Asterisk Manager configuration
function generateUniqueString() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

// Function to initiate a call
const makeCall = (destinationNumber, Gateway, dialplan, cddId) => {
  const amiId = generateUniqueString();
  amiList = {};

  amiList[amiId] = new AsteriskManager(
    5038,
    "localhost",
    "admin",
    "arhaan",
    true
  );

  return new Promise((resolve, reject) => {
    const CallOn = "PJSIP/" + destinationNumber + "@" + Gateway;
    const callerId = destinationNumber + "<" + cddId + ">";

    amiList[amiId].action(
      {
        action: "Originate",
        channel: CallOn,
        context: dialplan,
        exten: destinationNumber,
        priority: 1,
        callerid: callerId,
        timeout: 20000,
        async: true,
      },
      (err, res) => {
        if (err) {
          console.error("Error originating call:", err);
          reject(err);
        } else {
          console.log(`Call originated successfully to ${cddId}`);
          updateCallStatus(cddId, "InProcess", "Dialing Number");
        }
      }
    );

    amiList[amiId].on("managerevent", (event) => {
      if (event.event === "Hangup") {
        const id = parseInt(event.calleridnum);
        // console.log("Hangup Id:", id, "Active Id:", cddId);
        if (id === cddId) {
          resolve(event);
          console.log("Number Hang Up -> ", cddId, "Try Next. ->");

          updateCallStatus(id, "completed", event.channelstatedesc);
        }
      }
    });
  });
};

// Function to update call status in MySQL
const updateCallStatus = (id, status, response) => {
  db.query(
    "UPDATE phone_numbers SET status = ?, response = ? WHERE id = ?",
    [status, response, id],
    (err) => {
      if (err) {
        console.error("Error updating call status:", err);
      } else {
        if (status === "completed") {
          console.log("Call status updated:", id);
        }
      }
    }
  );
};

// Fetch phone numbers from the database
const fetchPhoneNumbers = () => {
  db.query(
    "SELECT id, phone_number FROM phone_numbers WHERE status = ?",
    ["pending"],
    async (err, results) => {
      if (err) {
        console.error("Error fetching phone numbers:", err);
        return;
      }

      if (results.length === 0) {
        console.log("No Data to Run");
        fetchData();
        return;
      }

      console.log(results);

      // Process numbers in pairs
      for (let i = 0; i < results.length; i += 4) {
        const pair = results.slice(i, i + 4); // Get a pair of numbers

        try {
          // Make two calls in parallel
          await Promise.all(
            pair.map((row) =>
              makeCall(row.phone_number, "gt206", "obd-setup", row.id)
            )
          );

          // Update statuses after both calls in the pair are completed
          // pair.forEach((row) =>
          //   updateCallStatus(row.id, "completed", "Hangup")
          // );
        } catch (error) {
          console.error("Error in processing pair:", error);
          pair.forEach((row) => updateCallStatus(row.id, "failed", "Error"));
        }
      }

      fetchData();
    }
  );
};

const fetchData = () => {
  const dateTimeString = getCurrentDateTime();
  console.log("Processing completed. Fetching data...", dateTimeString);
  // Add your data fetching logic here
};

// Start fetching phone numbers
module.exports = {
  fetchPhoneNumbers,
};
