const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const { parse } = require("path");

class FormPermissionController {
  async formPermissionsGet(req, res) {
    try {
      const token = req.cookies.token;

      const { roleId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const formPermissions = await prisma.formPermission.findMany({
          where: {
            roleId: parseInt(roleId),
            status: 1,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Insurance Forms fetched!", {
          ...adminDataWithoutPassword,
          formPermissions,
        });
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
      const { roleId, formId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const formPermissionAlreadyExist =
          await prisma.formPermission.findFirst({
            where: {
              roleId: parseInt(roleId),
              formId,
            },
          });

        if (formPermissionAlreadyExist) {
          if (formPermissionAlreadyExist.status === 0) {
            const formPermissionsUpdated = await prisma.formPermission.update({
              where: {
                roleId: parseInt(roleId),
                formId,
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
          } else {
            const formPermissionsUpdated = await prisma.formPermission.update({
              where: {
                roleId: parseInt(roleId),
                formId,
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
          }
        } else {
          const formPermissionsUpdated = await prisma.formPermission.create({
            data: {
              roleId: parseInt(roleId),
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
