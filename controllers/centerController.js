const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const getMenus = require("../utils/getMenus");
const getToken = require("../utils/getToken");

class CenterController {
  async centersGet(req, res) {
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
            status: 1,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Centers fetched!", {
          ...adminDataWithoutPassword,
          centers,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting centers ", error);
    }
  }

  async centerCreatePost(req, res) {
    try {
      const {
        centerName,
        ownerName,
        mobileNumber,
        emailId,
        location,
        branchId,
        userType,
        password,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const newUser = await prisma.center.create({
          data: {
            centerName,
            ownerName,
            mobileNumber,
            emailId,
            location,
            branchId,
            userType: parseInt(userType),
            password,
            status: 1,
            addedBy: loggedInUser.id,
          },
        });

        response.success(res, "Center registered successfully!", newUser);
      }
    } catch (error) {
      console.log("error while center registration ->", error);
    }
  }

  async centerUpdatePatch(req, res) {
    try {
      const {
        centerName,
        ownerName,
        mobileNumber,
        emailId,
        location,
        branchId,
        userType,
        password,
        status,
      } = req.body;

      const { centerId } = req.params;

      // finding user from id
      const centerFound = await prisma.center.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      if (centerFound) {
        if (status === 0) {
          const updatedCenter = await prisma.center.update({
            where: {
              id: parseInt(centerId),
            },

            data: {
              status: 0,
            },
          });

          response.success(res, "Center removed successfully!", {
            updatedCenter,
          });
        } else {
          const updatedCenter = await prisma.center.update({
            where: {
              id: parseInt(centerId),
            },

            data: {
              centerName,
              ownerName,
              mobileNumber,
              emailId,
              location,
              branchId,
              userType: parseInt(userType),
              password,
            },
          });

          response.success(res, "Center updated successfully!", {
            updatedCenter,
          });
        }
      } else {
        response.error(res, "Center not found!");
      }
    } catch (error) {
      console.log("error while updating center controller", error);
    }
  }

  async centerRemoveDelete(req, res) {
    try {
      const { centerId } = req.params;

      // finding user from userId
      const centerFound = await prisma.center.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      if (centerFound) {
        const deletedCenter = await prisma.center.delete({
          where: {
            id: parseInt(centerId),
          },
        });

        response.success(res, "Center deleted successfully!", {
          deletedCenter,
        });
      } else {
        response.error(res, "Center does not exist! ");
      }
    } catch (error) {
      console.log("error while deleting center ", error);
    }
  }
}

module.exports = new CenterController();
