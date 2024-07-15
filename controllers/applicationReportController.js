const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class ApplicationReportController {
  async applicationReportGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        let allApplicationReports;

        if (loggedInUser.roleId === 1) {
          allApplicationReports = await prisma.formStatus.findMany({});
        } else {
          const centerUser = await prisma.centerUser.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          allApplicationReports = await prisma.formStatus.findMany({
            where: {
              addedBy: centerUser.id,
            },
          });
        }

        const applicationReportWithDetails = await Promise.all(
          allApplicationReports?.map(async (report) => {
            let form;

            if (report.formType === "Credit Card") {
              form = await prisma.creditCardForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });
            } else if (report.formType === "Loan") {
              form = await prisma.loanForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });
            } else if (report.formType === "Insurance") {
              form = await prisma.insuranceForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });
            } else if (report.formType === "Demat Account") {
              form = await prisma.dematAccountForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });
            }

            const formUser = await prisma.centerUser.findFirst({
              where: {
                id: form?.addedBy,
              },
            });

            return {
              formId: report.formId,
              formStatus: report.formStatus,
              applicationNo: report.applicationNo,
              formType: report.formType,
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

  async applicationReportFilter(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { filters, searchQuery } = req.body;

      // if (Object.values(filters).filter(Boolean).length !== 0) {
      // console.log("FILTER VALUES ->", filters);
      // }
      // console.log("FILTER VALUES ->", filters);

      if (loggedInUser) {
        let allApplicationReports;

        if (loggedInUser.roleId === 1) {
          allApplicationReports = await prisma.formStatus.findMany({
            where: { OR: [{ formStatus: filters.selfStatus }] },
          });
        } else {
          const centerUser = await prisma.centerUser.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          allApplicationReports = await prisma.formStatus.findMany({
            where: {
              addedBy: centerUser.id,
              OR: [{ formStatus: filters.selfStatus }],
            },
          });
        }

        console.log("FILTER RANGE ->", filters.dateRange);

        const applicationReportWithDetails = await Promise.all(
          allApplicationReports?.map(async (report) => {
            let form;

            const searchCondition = {
              status: 1,
              // AND: [
              //   {
              OR: [
                { fullName: { contains: searchQuery } },
                { mobileNo: { contains: searchQuery } },
                { panNo: { contains: searchQuery } },
                {
                  addedBy: {
                    in: (
                      await prisma.centerUser.findMany({
                        where: {
                          centerName: filters?.center,
                        },
                        select: {
                          id: true,
                        },
                      })
                    ).map((user) => user.id),
                  },
                },
                {
                  createdAt: {
                    gte: new Date(
                      filters.dateRange?.length > 0 && filters.dateRange[0]
                    ),
                    lte: new Date(
                      filters.dateRange?.length > 0 && filters.dateRange[1]
                    ),
                  },
                },
              ],
              //   },

              // ],
            };

            if (report.formType === "Credit Card") {
              form = await prisma.creditCardForm.findFirst({
                where: {
                  id: report.formId,
                  ...searchCondition,
                },
              });
            } else if (report.formType === "Loan") {
              form = await prisma.loanForm.findFirst({
                where: {
                  id: report.formId,
                  ...searchCondition,
                },
              });
            } else if (report.formType === "Insurance") {
              form = await prisma.insuranceForm.findFirst({
                where: {
                  id: report.formId,
                  ...searchCondition,
                },
              });
            } else if (report.formType === "Demat Account") {
              form = await prisma.dematAccountForm.findFirst({
                where: {
                  id: report.formId,
                  ...searchCondition,
                },
              });
            }

            const formUser = await prisma.centerUser.findFirst({
              where: {
                id: form?.addedBy,
              },
            });
            if (form) {
              return {
                formId: report.formId,
                formStatus: report.formStatus,
                applicationNo: report.applicationNo,
                formType: report.formType,
                ...form,
                user: { ...formUser },
              };
            }
          })
        ).then((res) => res.filter(Boolean));

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
