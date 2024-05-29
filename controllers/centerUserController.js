const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const getMenus = require("../utils/getMenus");
const getToken = require("../utils/getToken");

class CenterUserController {
  async centerUsersGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
          include: {
            centers: true,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Center User fetched!", {
          ...adminDataWithoutPassword,
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

  async centerUserCreatePost(req, res) {
    try {
      const { name, emailId, password, location, branchId, userType } =
        req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const newUser = await prisma.centerUser.create({
          data: {
            name,
            emailId,
            password,
            location,
            branchId,
            userType: "NEED TO CHANGE LATER",
            status: 1,
            addedBy: loggedInUser.id,
          },
        });

        response.success(res, "Center User registered successfully!", newUser);
      }
    } catch (error) {
      console.log("error while center registration ->", error);
    }
  }

  async centerUserUpdatePatch(req, res) {
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

      const { centerId } = req.params;

      // finding user from id
      const centerUserFound = await prisma.centerUser.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      if (centerUserFound) {
        const updatedCenter = await prisma.centerUser.update({
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
            userType,
            password,
          },
        });

        response.success(res, "Center user updated successfully!", {
          updatedCenter,
        });
      } else {
        response.error(res, "Center user not found!");
      }
    } catch (error) {
      console.log("error while updating center controller", error);
    }
  }

  async centerUserRemoveDelete(req, res) {
    try {
      const { centerId } = req.params;

      // finding user from userId
      const centerUserFound = await prisma.centerUser.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      if (centerUserFound) {
        const deletedCenterUser = await prisma.centerUser.delete({
          where: {
            id: parseInt(centerId),
          },
        });

        response.success(res, "Center user deleted successfully!", {
          deletedCenterUser,
        });
      } else {
        response.error(res, "Center does not exist! ");
      }
    } catch (error) {
      console.log("error while deleting center user ", error);
    }
  }
}

module.exports = new CenterUserController();
