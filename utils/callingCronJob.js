const cron = require("node-cron");
const { processCall } = require("../processCall");

cron.schedule("*/30 * * * *", () => {
  console.log("Running a task every 30 minutes");
  processCall();
});
