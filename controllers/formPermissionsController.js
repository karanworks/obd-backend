const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class FormPermissionController {
  async formPermissionsGet(req, res) {
    try {
      const token = req.cookies.token;

      const { centerId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const center = await prisma.center.findFirst({
          where: {
            id: parseInt(centerId),
          },
        });

        console.log("CENTER ID ->", centerId);

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        if (center) {
          const formPermissions = await prisma.formPermission.findMany({
            where: {
              centerId: center?.id,
              status: 1,
            },
          });

          response.success(res, "Forms permissions fetched!", {
            ...adminDataWithoutPassword,
            formPermissions,
          });
        } else {
          const centerUser = await prisma.centerUser.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          if (centerUser) {
            const formPermissions = await prisma.formPermission.findMany({
              where: {
                centerId: centerUser?.centerId,
                status: 1,
              },
            });

            response.success(res, "Forms permissions fetched!", {
              ...adminDataWithoutPassword,
              formPermissions,
            });
          } else {
            response.error(res, "No Form Permissions for this user");
          }
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting form permissions ", error);
    }
  }

  async formAllowedPermissionsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const center = await prisma.center.findFirst({
          where: {
            emailId: loggedInUser.email,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        if (center) {
          const formPermissions = await prisma.formPermission.findMany({
            where: {
              centerId: center?.id,
              status: 1,
            },
          });

          response.success(res, "Forms permissions fetched!", {
            ...adminDataWithoutPassword,
            formPermissions,
          });
        } else {
          const centerUser = await prisma.centerUser.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          if (centerUser) {
            const formPermissions = await prisma.formPermission.findMany({
              where: {
                centerId: centerUser?.centerId,
                status: 1,
              },
            });

            response.success(res, "Forms permissions fetched!", {
              ...adminDataWithoutPassword,
              formPermissions,
            });
          } else {
            response.error(res, "No Form Permissions for this user");
          }
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting form permissions ", error);
    }
  }

  async formPermissionUpdatePost(req, res) {
    try {
      const { centerId, formId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const formPermissionAlreadyExist =
          await prisma.formPermission.findFirst({
            where: {
              centerId: parseInt(centerId),
              formId,
            },
          });

        if (formPermissionAlreadyExist) {
          if (formPermissionAlreadyExist.status === 0) {
            const formPermissionsUpdated = await prisma.formPermission.update({
              where: {
                id: formPermissionAlreadyExist.id,
                status: 0,
              },
              data: {
                status: 1,
              },
            });

            response.success(
              res,
              "Form permissions updated successfully!",
              formPermissionsUpdated
            );
          } else {
            const formPermissionsUpdated = await prisma.formPermission.update({
              where: {
                id: formPermissionAlreadyExist.id,
                status: 1,
              },
              data: {
                status: 0,
              },
            });
            response.success(
              res,
              "Form permissions updated successfully!",
              formPermissionsUpdated
            );
          }
        } else {
          const formPermissionsUpdated = await prisma.formPermission.create({
            data: {
              centerId: parseInt(centerId),
              formId,
              addedBy: loggedInUser.id,
            },
          });

          response.success(
            res,
            "Form permissions updated successfully!",
            formPermissionsUpdated
          );
        }
      } else {
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while form permission updation ->", error);
    }
  }
}

module.exports = new FormPermissionController();
