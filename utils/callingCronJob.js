const cron = require("node-cron");
const { processCall } = require("../processCall");

cron.schedule("*/3 * * * *", () => {
  console.log("Running a task every 30 minutes");
  processCall();
});

console.log("Cron job scheduled to run every 30 minutes.");
