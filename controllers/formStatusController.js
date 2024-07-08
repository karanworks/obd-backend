const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class FormStatusController {
  async formStatusUpdatePost(req, res) {
    try {
      const { formId, applicationNo, formStatus } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const formStatusToUpdate = await prisma.formStatus.findFirst({
          where: {
            formId,
          },
        });

        const formStatusUpdated = await prisma.formStatus.update({
          where: {
            id: formStatusToUpdate.id,
          },
          data: {
            applicationNo,
            formStatus,
          },
        });
        response.success(
          res,
          "Form status updated successfully!",
          formStatusUpdated
        );
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  }
}

module.exports = new FormStatusController();
