const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class PendingFormController {
  async pendingFormsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        if (loggedInUser.roleId === 1) {
          const forms = await prisma.form.findMany({
            where: {
              status: 1,
            },
          });

          const formWithStatusAndApplicationNo = await Promise.all(
            forms.map(async (form) => {
              const formStatus = await prisma.formStatus.findFirst({
                where: {
                  formId: form.id,
                },
              });

              return {
                ...form,
                applicationNo: formStatus.applicationNo,
                formStatus: formStatus.formStatus,
              };
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            forms: formWithStatusAndApplicationNo,
          });
        } else {
          const forms = await prisma.form.findMany({
            where: {
              addedBy: loggedInUser.id,
              status: 1,
            },
          });

          const formWithStatusAndApplicationNo = await Promise.all(
            forms.map(async (form) => {
              const formStatus = await prisma.formStatus.findFirst({
                where: {
                  formId: forms,
                },
              });

              return {
                ...form,
                applicationNo: formStatus.applicationNo,
                formStatus: formStatus.formStatus,
              };
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            forms: formWithStatusAndApplicationNo,
          });
        }
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
}

module.exports = new PendingFormController();
