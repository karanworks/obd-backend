const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const getMenus = require("../utils/getMenus");
const getToken = require("../utils/getToken");
const { parse } = require("path");

class CenterUserController {
  async centerUsersGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const centers = await prisma.center.findMany({
          where: {
            // addedBy: loggedInUser.id,
            status: 1,
          },
        });

        // these center users are going to be used while filling the form so that employee can be selected, for more info go to form filling page
        const centerUsers = await prisma.centerUser.findMany({});

        let users;
        if (loggedInUser.roleId === 1) {
          users = await prisma.centerUser.findMany({
            where: { status: 1 },
          });
        } else {
          users = await prisma.centerUser.findMany({
            where: {
              addedBy: loggedInUser.id,
              status: 1,
            },
          });
        }

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Center User fetched!", {
          ...adminDataWithoutPassword,
          users,
          centers,
          centerUsers,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res.status(401).json({
          message: "center user not already logged in.",
          status: "failure",
        });
      }
    } catch (error) {
      console.log("error while getting centers ", error);
    }
  }

  async centerUserCreatePost(req, res) {
    try {
      const {
        name,
        email,
        password,
        location,
        centerName,
        mobileNumber,
        age,
        aadharNumber,
        panNo,
        branchId,
        userType,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);
      const userIp = req.socket.remoteAddress;

      const { centerId } = req.params;

      const alreadyRegistered = await prisma.centerUser.findFirst({
        where: {
          OR: [{ email }],
        },
      });

      if (loggedInUser) {
        if (alreadyRegistered) {
          if (
            alreadyRegistered.email === email ||
            alreadyRegistered.mobileNumber === mobileNumber
          ) {
            response.error(
              res,
              "User already registered with this Email Or Mobile Number.",
              alreadyRegistered
            );
          }
        } else {
          const newCenterUser = await prisma.centerUser.create({
            data: {
              name,
              email,
              password,
              location,
              centerName,
              mobileNumber,
              age,
              aadharNumber,
              panNo,
              branchId,
              centerId: parseInt(centerId),
              userType: parseInt(userType),
              status: 1,
              addedBy: loggedInUser.id,
            },
          });

          const newUser = await prisma.user.create({
            data: {
              username: name,
              email,
              password: password,
              roleId: parseInt(userType),
              userIp,
            },
          });

          response.success(
            res,
            "Center User registered successfully!",
            newCenterUser
          );
        }
      }
    } catch (error) {
      console.log("error while center registration ->", error);
    }
  }

  async centerUserUpdatePatch(req, res) {
    try {
      const {
        name,
        email,
        password,
        location,
        centerName,
        mobileNumber,
        age,
        aadharNumber,
        panNo,
        branchId,
        userType,
        status,
      } = req.body;

      const { centerId, centerUserId } = req.params;

      // console.log(status, centerId, centerUserId);

      const centerUserFound = await prisma.centerUser.findFirst({
        where: {
          id: parseInt(centerUserId),
        },
      });

      const alreadyRegistered = await prisma.centerUser.findFirst({
        where: {
          OR: [{ email }],
        },
      });

      if (centerUserFound) {
        if (status === 0 || status === 1) {
          const updatedCenterUser = await prisma.centerUser.update({
            where: {
              id: centerUserFound.id,
            },
            data: {
              status,
            },
          });

          // update the status of corresponding user so that he can't log in
          const userToBeUpdated = await prisma.user.findFirst({
            where: {
              email: updatedCenterUser.email,
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

          return response.success(res, "Center user removed successfully!", {
            updatedCenterUser,
          });
        } else {
          if (alreadyRegistered.id !== parseInt(centerUserId)) {
            if (
              alreadyRegistered.email === email ||
              alreadyRegistered.mobileNumber === mobileNumber
            ) {
              response.error(
                res,
                "User already registered with this Email Or Mobile Number.",
                alreadyRegistered
              );
            }
          } else {
            // update the details in user table as well
            const userToBeUpdated = await prisma.user.findFirst({
              where: {
                email: centerUserFound.email,
              },
            });

            const updatedUser = await prisma.user.update({
              where: {
                id: userToBeUpdated.id,
              },
              data: {
                username: name,
                email,
                password,
              },
            });

            const updatedCenterUser = await prisma.centerUser.update({
              where: {
                id: centerUserFound.id,
              },
              data: {
                name,
                email,
                password,
                location,
                centerName,
                mobileNumber,
                age,
                aadharNumber,
                panNo,
                branchId,
                centerId: parseInt(centerId),
                userType: parseInt(userType),
                status,
              },
            });

            response.success(res, "Center user updated successfully!", {
              updatedCenterUser,
            });
          }
        }
      } else {
        response.error(res, "Center user not found!");
      }
    } catch (error) {
      console.log("error while updating center controller", error);
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

module.exports = new CenterUserController();
