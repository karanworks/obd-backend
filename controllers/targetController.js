const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const getMenus = require("../utils/getMenus");
const getToken = require("../utils/getToken");
const { parse } = require("path");

class TargetController {
  async targetGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const targets = await prisma.target.findMany({});

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Targets fetched!", {
          ...adminDataWithoutPassword,
          targets,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res.status(401).json({
          message: "user not already logged in.",
          status: "failure",
        });
      }
    } catch (error) {
      console.log("error while getting targets ", error);
    }
  }

  async targetCreatePost(req, res) {
    try {
      const { teamId, month, target } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      let addingTeamId;

      if (loggedInUser.roleId === 2) {
        const team = await prisma.team.findFirst({
          where: {
            email: loggedInUser.email,
          },
        });

        addingTeamId = team.id;
      }

      if (loggedInUser) {
        const today = new Date();

        const newTarget = await prisma.target.create({
          data: {
            teamId,
            month,
            year: today.getFullYear(),
            target,
          },
        });

        response.success(res, "Target created successfully!", newTarget);
      }
    } catch (error) {
      console.log("error while target creation ->", error);
    }
  }

  async targetUpdatePatch(req, res) {
    try {
      const { month, target } = req.body;

      const { teamId, targetId } = req.params;

      const targetFound = await prisma.target.findFirst({
        where: {
          id: parseInt(targetId),
        },
      });

      if (targetFound) {
        const updatedTarget = await prisma.target.update({
          where: {
            id: targetFound.id,
          },
          data: {
            teamId: parseInt(teamId),
            month,
            target,
          },
        });

        response.success(res, "Target updated successfully!", {
          updatedTarget,
        });
      } else {
        response.error(res, "Target not found!");
      }
    } catch (error) {
      console.log("error while updating target controller", error);
    }
  }
}

module.exports = new TargetController();
