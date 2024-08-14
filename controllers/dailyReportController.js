const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class DailyReportController {
  async dailyReportGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        if (loggedInUser.roleId === 1) {
          const result = await prisma.$queryRaw`
          SELECT
            agentName,
            COUNT(phoneNumber) AS attempts,
            COUNT(DISTINCT phoneNumber) AS uniqueAttempts
          FROM dailyDialerReport
          GROUP BY agentId, agentName;
        `;

          const dailyReport = result.map((item) => ({
            ...item,
            attempts: Number(item.attempts),
            uniqueAttempts: Number(item.uniqueAttempts),
          }));

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Daily Report fetched!", {
            ...adminDataWithoutPassword,
            dailyReport,
          });
        } else {
          const result = await prisma.$queryRaw`
          SELECT
            agentName,
            COUNT(phoneNumber) AS attempts,
            COUNT(DISTINCT phoneNumber) AS uniqueAttempts
          FROM dailyDialerReport
          GROUP BY agentId, agentName;
        `;

          const dailyReport = result.map((item) => ({
            ...item,
            attempts: Number(item.attempts),
            uniqueAttempts: Number(item.uniqueAttempts),
          }));
          response.success(res, "Daily Report fetched!", {
            ...adminDataWithoutPassword,
            dailyReport,
          });
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting daily report ", error);
    }
  }
}

module.exports = new DailyReportController();
