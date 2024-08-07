const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");

class ReportUploadController {
  async reportUploadGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        let reportUploads;

        if (loggedInUser.roleId === 1) {
          reportUploads = await prisma.formStatus.findMany({
            where: {
              formStatus: "VKYC Done",
            },
          });
        } else {
          const centerUser = await prisma.centerUser.findFirst({
            where: {
              email: loggedInUser.email,
            },
          });

          reportUploads = await prisma.formStatus.findMany({
            where: {
              addedBy: centerUser.id,
              formStatus: "VKYC Done",
            },
          });
        }

        const reportUploadWithDetails = await Promise.all(
          reportUploads?.map(async (report) => {
            let form;

            if (report.formType === "Credit Card") {
              const creditCardForm = await prisma.creditCardForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const { id, ...otherPropertiesOfCreditCardForm } = creditCardForm;

              const bankStatus = await prisma.bankStatus.findFirst({
                where: {
                  formId: report.formId,
                  formType: "Credit Card",
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Credit Card",
                },
              });

              form = {
                ...otherPropertiesOfCreditCardForm,
                ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Loan") {
              const LoanForm = await prisma.loanForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const { id, ...otherPropertiesOfLoanForm } = LoanForm;

              const bankStatus = await prisma.bankStatus.findFirst({
                where: {
                  formId: report.formId,
                  formType: "Loan",
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Loan",
                },
              });

              form = {
                ...otherPropertiesOfLoanForm,
                ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Insurance") {
              const insuranceForm = await prisma.insuranceForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const { id, ...otherPropertiesOfInsuranceForm } = insuranceForm;

              const bankStatus = await prisma.bankStatus.findFirst({
                where: {
                  formId: report.formId,
                  formType: "Insurance",
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Insurance",
                },
              });

              form = {
                ...otherPropertiesOfInsuranceForm,
                ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Demat Account") {
              const DematAccountForm = await prisma.dematAccountForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              const { id, ...otherPropertiesDematAccountForm } =
                DematAccountForm;

              const bankStatus = await prisma.bankStatus.findFirst({
                where: {
                  formId: report.formId,
                  formType: "Demat Account",
                  status: 1,
                },
              });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Demat Account",
                },
              });

              form = {
                ...otherPropertiesDematAccountForm,
                ...bankStatus,
                previousBankStatuses,
              };
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
          reportUpload: reportUploadWithDetails,
        });
      }
    } catch (error) {
      console.log("error while fetching application reports ->", error);
    }
  }

  async reportUploadUpdateStatus(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { formId, formType, comment, bankStatus } = req.body;

      if (loggedInUser) {
        const formAlreadyExist = await prisma.bankStatus.findFirst({
          where: {
            formId: parseInt(formId),
            formType,
            status: 1,
          },
        });
        let formStatusToBeUpdated = await prisma.formStatus.findFirst({
          where: {
            formType,
            formId: parseInt(formId),
          },
        });

        if (formAlreadyExist) {
          const updatedBankStatus = await prisma.bankStatus.update({
            where: {
              id: formAlreadyExist.id,
            },
            data: {
              comment,
              bankStatus,
            },
          });

          await prisma.formStatus.update({
            where: {
              id: formStatusToBeUpdated.id,
            },
            data: {
              bankStatus: updatedBankStatus.bankStatus,
            },
          });

          response.success(res, "Form status updated!", { updatedBankStatus });
        } else {
          const updatedBankStatus = await prisma.bankStatus.create({
            data: {
              formId: parseInt(formId),
              formType,
              comment,
              bankStatus,
            },
          });

          await prisma.formStatus.update({
            where: {
              id: formStatusToBeUpdated.id,
            },
            data: {
              bankStatus: updatedBankStatus.bankStatus,
            },
          });

          response.success(res, "Form status updated!", { updatedBankStatus });
        }
      }
    } catch (error) {
      console.log("error while fetching reports data ->", error);
    }
  }

  async reportUploadUpdateStatusWithFile(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { bankName } = req.body;
      const { buffer } = req.file;

      if (loggedInUser) {
        const workbook = xlsx.read(buffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        await prisma.$transaction(async (prisma) => {
          for (const record of jsonData) {
            const { applicationNo, bankStatus, comment } = record;

            // Update existing records with the same applicationNo
            await prisma.bankStatus.updateMany({
              where: { applicationNo: String(applicationNo) },
              data: { status: 0 },
            });

            // Create new record
            await prisma.bankStatus.create({
              data: {
                applicationNo: String(applicationNo),
                bankStatus,
                comment,
                formType: "Credit Card",
              },
            });
          }
        });
      }
    } catch (error) {
      console.log("error while fetching reports data ->", error);
    }
  }

  async reportUploadFilter(req, res) {
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

  async reportUploadDeleteStatus(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { bankStatusId } = req.params;

      if (loggedInUser) {
        const deletedBankStatus = await prisma.bankStatus.update({
          where: {
            id: parseInt(bankStatusId),
          },
          data: {
            status: 0,
          },
        });

        let formStatusToBeUpdated = await prisma.formStatus.findFirst({
          where: {
            formType: deletedBankStatus.formType,
            formId: parseInt(deletedBankStatus.formId),
          },
        });

        await prisma.formStatus.update({
          where: {
            id: formStatusToBeUpdated.id,
          },
          data: {
            bankStatus: null,
          },
        });

        response.success(res, "Fetched application reports!", {
          deletedBankStatus,
        });
      }
    } catch (error) {
      console.log("error while fetching application reports ->", error);
    }
  }
}

module.exports = new ReportUploadController();
