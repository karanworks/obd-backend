const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class TeamController {
  async teamsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const teams = await prisma.team.findMany({});

        // const centerWithUsers = await Promise.all(
        //   centers?.map(async (center) => {
        //     const centerUsers = await prisma.centerUser.findMany({
        //       where: {
        //         centerId: center.id,
        //       },
        //     });

        //     return {
        //       ...center,
        //       centerUsers,
        //     };
        //   })
        // );

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Teams fetched!", {
          ...adminDataWithoutPassword,
          teams,
        });
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

  async teamCreatePost(req, res) {
    try {
      const { teamName, email, password } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);
      const userIp = req.socket.remoteAddress;

      const alreadyRegistered = await prisma.team.findFirst({
        where: {
          OR: [{ email }],
        },
      });

      if (loggedInUser) {
        if (alreadyRegistered) {
          if (alreadyRegistered.email === email) {
            response.error(
              res,
              "Team already registered with this Email.",
              alreadyRegistered
            );
          }
        } else {
          const newTeam = await prisma.team.create({
            data: {
              teamName,
              email: email.toLowerCase(),
              password,
              status: 1,
              userType: 2,
              addedBy: loggedInUser.id,
            },
          });

          // create user for team
          await prisma.user.create({
            data: {
              username: teamName,
              email: email.toLowerCase(),
              password,
              roleId: 2,
              userIp,
            },
          });

          response.success(res, "Team registered successfully!", newTeam);
        }
      }
    } catch (error) {
      console.log("error while team registration ->", error);
    }
  }

  async teamUpdatePatch(req, res) {
    try {
      const { teamName, email, password, status } = req.body;

      const { teamId } = req.params;

      // finding user from id
      const teamFound = await prisma.team.findFirst({
        where: {
          id: parseInt(teamId),
        },
      });

      const alreadyRegistered = await prisma.team.findFirst({
        where: {
          OR: [{ email }],
        },
      });

      if (teamFound) {
        if (status === 0 || status === 1) {
          const updatedTeam = await prisma.team.update({
            where: {
              id: parseInt(teamId),
            },

            data: {
              status,
            },
          });

          // update the status of corresponding user so that he can't log in
          const userToBeUpdated = await prisma.user.findFirst({
            where: {
              email: updatedTeam.email,
            },
          });

          // update team
          await prisma.user.update({
            where: {
              id: userToBeUpdated.id,
            },
            data: {
              status,
            },
          });

          response.success(res, "Team removed successfully!", {
            updatedTeam,
          });
        } else {
          if (
            alreadyRegistered &&
            alreadyRegistered.id !== parseInt(teamFound.id)
          ) {
            if (alreadyRegistered.email === email) {
              response.error(
                res,
                "Team already registered with this Email.",
                alreadyRegistered
              );
            }
          } else {
            // update the details in user table as well
            const userToBeUpdated = await prisma.user.findFirst({
              where: {
                email: teamFound.email.toLowerCase(),
              },
            });

            const updatedUser = await prisma.user.update({
              where: {
                id: userToBeUpdated.id,
              },
              data: {
                username: teamName,
                email: email.toLowerCase(),
                password,
              },
            });

            const updatedTeam = await prisma.team.update({
              where: {
                id: parseInt(teamId),
              },

              data: {
                teamName,
                email: email.toLowerCase(),
                password,
              },
            });

            response.success(res, "Team updated successfully!", {
              updatedTeam,
            });
          }
        }
      } else {
        response.error(res, "Team not found!");
      }
    } catch (error) {
      console.log("error while updating team controller", error);
    }
  }

  // async centerRemoveDelete(req, res) {
  //   try {
  //     const { centerId } = req.params;

  //     // finding user from userId
  //     const centerFound = await prisma.center.findFirst({
  //       where: {
  //         id: parseInt(centerId),
  //       },
  //     });

  //     if (centerFound) {
  //       const deletedCenter = await prisma.center.delete({
  //         where: {
  //           id: parseInt(centerId),
  //         },
  //       });

  //       response.success(res, "Center deleted successfully!", {
  //         deletedCenter,
  //       });
  //     } else {
  //       response.error(res, "Center does not exist! ");
  //     }
  //   } catch (error) {
  //     console.log("error while deleting center ", error);
  //   }
  // }
}

module.exports = new TeamController();
