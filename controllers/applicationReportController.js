const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class ApplicationReportController {
  async applicationReportGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const allApplicationReports = await prisma.formStatus.findMany({});

        const applicationReportWithDetails = await Promise.all(
          allApplicationReports?.map(async (report) => {
            const form = await prisma.form.findFirst({
              where: {
                id: report.formId,
              },
            });

            const formUser = await prisma.centerUser.findFirst({
              where: {
                id: form.addedBy,
              },
            });

            console.log("FORM USER ->", form.addedBy);

            return {
              formId: report.formId,
              formStatus: report.formStatus,
              applicationNo: report.applicationNo,
              ...form,
              user: { ...formUser },
            };
          })
        );

        response.success(res, "Fetched application reports!", {
          applicationReports: applicationReportWithDetails,
        });
      }
    } catch (error) {
      console.log("error while fetching application reports ->", error);
    }
  }
}

module.exports = new ApplicationReportController();
