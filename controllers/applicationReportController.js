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
              const currentForm = await prisma.creditCardForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: currentForm.id,
                  formType: report.formType,
                  bankId: report.bankId,
                },
              });

              form = { ...currentForm, previousBankStatuses };
            } else if (report.formType === "Loan") {
              const currentForm = await prisma.loanForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: currentForm.id,
                  formType: report.formType,
                  bankId: report.bankId,
                },
              });

              form = { ...currentForm, previousBankStatuses };
            } else if (report.formType === "Insurance") {
              const currentForm = await prisma.insuranceForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: currentForm.id,
                  formType: report.formType,
                  bankId: report.bankId,
                },
              });

              form = { ...currentForm, previousBankStatuses };
            } else if (report.formType === "Demat Account") {
              const currentForm = await prisma.dematAccountForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: currentForm.id,
                  formType: report.formType,
                  bankId: report.bankId,
                },
              });

              form = { ...currentForm, previousBankStatuses };
            }

            const formUser = await prisma.centerUser.findFirst({
              where: {
                id: form?.addedBy,
              },
            });

            return {
              formId: report.formId,
              formStatus: report.formStatus,
              bankStatus: report.bankStatus,
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

      if (loggedInUser) {
        let allApplicationReports;

        const applicationReportsCondition = {
          AND: [],
        };

        if (filters?.selfStatus) {
          applicationReportsCondition.AND.push({
            formStatus: filters?.selfStatus,
          });
        }
        if (filters?.formType) {
          applicationReportsCondition.AND.push({
            formType: filters?.formType,
          });
        }

        // If no filters are provided, remove the OR clause to avoid empty condition
        if (applicationReportsCondition.AND.length === 0) {
          delete applicationReportsCondition.AND;
        }

        if (loggedInUser.roleId === 1) {
          allApplicationReports = await prisma.formStatus.findMany({
            where: { ...applicationReportsCondition },
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
              ...applicationReportsCondition,
            },
          });
        }

        const searchCondition = {
          status: 1,
          OR: [],
          AND: [],
        };

        if (searchQuery) {
          searchCondition.OR.push(
            { fullName: { contains: searchQuery } },
            { mobileNo: { contains: searchQuery } },
            { panNo: { contains: searchQuery } }
          );
        } else {
          delete searchCondition.OR;
        }

        // Add center condition if center filter is present
        if (filters?.center) {
          const centerUserIds = (
            await prisma.centerUser.findMany({
              where: {
                centerName: filters.center,
              },
              select: {
                id: true,
              },
            })
          ).map((user) => user.id);

          searchCondition.AND.push({
            addedBy: {
              in: centerUserIds,
            },
          });
        }

        // Add date range condition if date range filter is present
        if (filters?.dateRange?.length > 0) {
          searchCondition.AND.push({
            createdAt: {
              gte: new Date(filters.dateRange[0]),
              lte: new Date(filters.dateRange[1]),
            },
          });
        }

        if (searchCondition.AND.length === 0) {
          delete searchCondition.AND;
        }

        const applicationReportWithDetails = await Promise.all(
          allApplicationReports?.map(async (report) => {
            let form;

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
