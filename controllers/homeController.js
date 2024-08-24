const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const { log } = require("node:console");

class HomeController {
  async homeGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        if (loggedInUser.roleId === 1) {
          const teams = await prisma.team.findMany({});

          response.success(res, "Teams fetched!", {
            ...adminDataWithoutPassword,
            teams,
          });
        } else if (loggedInUser.roleId === 2) {
          const team = await prisma.team.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          const teamMembers = await prisma.employee.findMany({
            where: {
              teamId: team.id,
            },
          });

          response.success(res, "Team Members fetched!", {
            ...adminDataWithoutPassword,
            teamMembers,
          });
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting teams", error);
    }
  }
}

module.exports = new HomeController();
