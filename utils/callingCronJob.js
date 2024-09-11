const cron = require("node-cron");

// Schedule a task to run every 5 minutes
cron.schedule("*/5 * * * *", () => {
  console.log("Running a task every 5 minutes");
  // Add your job logic here
});

console.log("Cron job scheduled to run every 5 minutes.");
