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
            COUNT(DISTINCT phoneNumber) AS uniqueAttempts,
            agentId,
             TIME_FORMAT(SEC_TO_TIME(SUM(TIME_TO_SEC(talkTime))), '%H:%i:%s') AS totalTalkTime
          FROM dailyDialerReport
          GROUP BY agentId, agentName;
        `;

          const dailyReport = await Promise.all(
            result.map(async (item) => {
              const userData = await prisma.centerUser.findFirst({
                where: {
                  agentId: item.agentId,
                },
              });
              const vkycDoneCount = await prisma.formStatus.count({
                where: {
                  addedBy: userData.id,
                  formStatus: "VKYC Done",
                },
              });

              const interestedClients = await prisma.formStatus.count({
                where: {
                  addedBy: userData.id,
                  formStatus: "",
                },
              });
              return {
                ...item,
                attempts: Number(item.attempts),
                uniqueAttempts: Number(item.uniqueAttempts),
                userData,
                vkycDoneCount,
                interestedClients,
              };
            })
          );

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
            COUNT(DISTINCT phoneNumber) AS uniqueAttempts,
            agentId,
            TIME_FORMAT(SEC_TO_TIME(SUM(TIME_TO_SEC(talkTime))), '%H:%i:%s') AS totalTalkTime
          FROM dailyDialerReport
          GROUP BY agentId, agentName;
        `;

          const dailyReport = await Promise.all(
            result.map(async (item) => {
              const userData = await prisma.centerUser.findFirst({
                where: {
                  agentId: item.agentId,
                },
              });
              const vkycDoneCount = await prisma.formStatus.count({
                where: {
                  addedBy: userData.id,
                  formStatus: "VKYC Done",
                },
              });
              const interestedClients = await prisma.formStatus.count({
                where: {
                  addedBy: userData.id,
                  formStatus: "",
                },
              });
              return {
                ...item,
                attempts: Number(item.attempts),
                uniqueAttempts: Number(item.uniqueAttempts),
                userData,
                vkycDoneCount,
                interestedClients,
              };
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

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

  // async dailyReportFilter(req, res) {
  //   try {
  //     const loggedInUser = await getLoggedInUser(req, res);
  //     const { centerId, centerUserId } = req.body;

  //     const user = await prisma.centerUser.findFirst({
  //       where: {
  //         id: parseInt(centerUserId),
  //         centerId: parseInt(centerId),
  //       },
  //     });

  //     if (loggedInUser) {
  //       const result = await prisma.$queryRawUnsafe(
  //         `
  //         SELECT
  //           agentName,
  //           COUNT(phoneNumber) AS attempts,
  //           COUNT(DISTINCT phoneNumber) AS uniqueAttempts,
  //           agentId,
  //            TIME_FORMAT(SEC_TO_TIME(SUM(TIME_TO_SEC(talkTime))), '%H:%i:%s') AS totalTalkTime
  //         FROM dailyDialerReport
  //         WHERE agentId = ? AND agentName = ?
  //         GROUP BY agentId, agentName;
  //       `,
  //         user.agentId,
  //         user.name
  //       );

  //       const userData = await prisma.centerUser.findFirst({
  //         where: {
  //           agentId: user.agentId,
  //         },
  //       });
  //       const vkycDoneCount = await prisma.formStatus.count({
  //         where: {
  //           addedBy: userData.id,
  //           formStatus: "VKYC Done",
  //         },
  //       });

  //       response.success(res, "Fetched filtered daily reports!", {});
  //     }
  //   } catch (error) {
  //     console.log("error while fetching daily reports ->", error);
  //   }
  // }

  async dailyReportFilter(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { centerId, centerUserIds } = req.body;

      if (loggedInUser) {
        const users = await prisma.centerUser.findMany({
          where: {
            id: { in: centerUserIds.map((id) => parseInt(id)) },
            centerId: parseInt(centerId),
          },
        });

        const results = await Promise.all(
          users.map(async (user) => {
            const result = await prisma.$queryRawUnsafe(
              `
            SELECT
              agentName,
              COUNT(phoneNumber) AS attempts,
              COUNT(DISTINCT phoneNumber) AS uniqueAttempts,
              agentId,
               TIME_FORMAT(SEC_TO_TIME(SUM(TIME_TO_SEC(talkTime))), '%H:%i:%s') AS totalTalkTime
            FROM dailyDialerReport
            WHERE agentId = ? AND agentName = ?
            GROUP BY agentId, agentName;
            `,
              user.agentId,
              user.name
            );

            const userData = await prisma.centerUser.findFirst({
              where: {
                agentId: user.agentId,
              },
            });

            const vkycDoneCount = await prisma.formStatus.count({
              where: {
                addedBy: userData.id,
                formStatus: "VKYC Done",
              },
            });

            const interestedClients = await prisma.formStatus.count({
              where: {
                addedBy: userData.id,
                formStatus: "",
              },
            });

            return {
              ...result[0],
              attempts: Number(result[0].attempts),
              uniqueAttempts: Number(result[0].uniqueAttempts),
              userData,
              vkycDoneCount,
              interestedClients,
            };
          })
        );

        response.success(res, "Fetched filtered daily reports!", {
          filteredDailyReport: results,
        });
      }
    } catch (error) {
      console.log("error while fetching daily reports ->", error);
      response.error(res, "Error while fetching daily reports");
    }
  }
}

module.exports = new DailyReportController();
