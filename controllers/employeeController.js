const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const getMenus = require("../utils/getMenus");
const getToken = require("../utils/getToken");
const { parse } = require("path");

class EmployeeController {
  async employeesGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const teams = await prisma.team.findMany({
          where: {
            status: 1,
          },
        });

        const loggedInUserTeam = await prisma.team.findFirst({
          where: {
            email: loggedInUser.email,
          },
        });

        let employees;
        if (loggedInUser.roleId === 1) {
          employees = await prisma.employee.findMany({});
        } else {
          employees = await prisma.employee.findMany({
            where: {
              teamId: loggedInUserTeam.id,
            },
          });
        }

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Employee fetched!", {
          ...adminDataWithoutPassword,
          employees,
          teams,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res.status(401).json({
          message: "employee not already logged in.",
          status: "failure",
        });
      }
    } catch (error) {
      console.log("error while getting employee ", error);
    }
  }

  async employeeCreatePost(req, res) {
    try {
      const { employeeName, email, password, teamId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);
      const userIp = req.socket.remoteAddress;

      const alreadyRegistered = await prisma.employee.findFirst({
        where: {
          OR: [{ email }],
        },
      });

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
        if (alreadyRegistered) {
          if (alreadyRegistered.email === email) {
            response.error(
              res,
              "User already registered with this Email.",
              alreadyRegistered
            );
          }
        } else {
          const newEmployee = await prisma.employee.create({
            data: {
              employeeName,
              email,
              password,
              teamId: addingTeamId ? addingTeamId : parseInt(teamId),
              userType: 3,
              status: 1,
              addedBy: loggedInUser.id,
            },
          });

          await prisma.user.create({
            data: {
              username: employeeName,
              email,
              password: password,
              roleId: 3,
              userIp,
            },
          });

          response.success(
            res,
            "Employee registered successfully!",
            newEmployee
          );
        }
      }
    } catch (error) {
      console.log("error while employee registration ->", error);
    }
  }

  async employeeUpdatePatch(req, res) {
    try {
      const { employeeName, email, password, status } = req.body;

      const { teamId, employeeId } = req.params;

      const employeeFound = await prisma.employee.findFirst({
        where: {
          id: parseInt(employeeId),
        },
      });

      const alreadyRegistered = await prisma.employee.findFirst({
        where: {
          OR: [{ email }],
        },
      });

      if (employeeFound) {
        if (status === 0 || status === 1) {
          const updatedEmployee = await prisma.employee.update({
            where: {
              id: employeeFound.id,
            },
            data: {
              status,
            },
          });

          // update the status of corresponding user so that he can't log in
          const userToBeUpdated = await prisma.user.findFirst({
            where: {
              email: updatedEmployee.email,
            },
          });

          const updatedUser = await prisma.user.update({
            where: {
              id: userToBeUpdated.id,
            },
            data: {
              status,
            },
          });

          return response.success(res, "Employee user removed successfully!", {
            updatedEmployee,
          });
        } else {
          if (
            alreadyRegistered &&
            alreadyRegistered.id !== parseInt(employeeId)
          ) {
            if (alreadyRegistered.email === email) {
              response.error(
                res,
                "User already registered with this Email.",
                alreadyRegistered
              );
            }
          } else {
            // update the details in user table as well
            const userToBeUpdated = await prisma.user.findFirst({
              where: {
                email: employeeFound.email,
              },
            });

            const updatedUser = await prisma.user.update({
              where: {
                id: userToBeUpdated.id,
              },
              data: {
                username: employeeName,
                email,
                password,
              },
            });

            const updatedEmployee = await prisma.employee.update({
              where: {
                id: employeeFound.id,
              },
              data: {
                employeeName,
                email,
                password,
                teamId: parseInt(teamId),
                status,
              },
            });

            response.success(res, "Employee updated successfully!", {
              updatedEmployee,
            });
          }
        }
      } else {
        response.error(res, "Employee user not found!");
      }
    } catch (error) {
      console.log("error while updating employee controller", error);
    }
  }

  // async centerUserRemoveDelete(req, res) {
  //   try {
  //     const { centerId, centerUserId } = req.params;

  //     // finding user from userId
  //     const centerUserFound = await prisma.centerUser.findFirst({
  //       where: {
  //         id: parseInt(centerUserId),
  //       },
  //     });

  //     if (centerUserFound) {
  //       const deletedCenterUser = await prisma.centerUser.delete({
  //         where: {
  //           id: centerUserFound.id,
  //         },
  //       });

  //       response.success(res, "Center user deleted successfully!", {
  //         deletedCenterUser,
  //       });
  //     } else {
  //       response.error(res, "Center does not exist! ");
  //     }
  //   } catch (error) {
  //     console.log("error while deleting center user ", error);
  //   }
  // }
}

module.exports = new EmployeeController();
