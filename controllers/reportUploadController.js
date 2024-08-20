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

              // const { id, ...otherPropertiesOfCreditCardForm } = creditCardForm;

              // const bankStatus = await prisma.bankStatus.findFirst({
              //   where: {
              //     formId: report.formId,
              //     formType: "Credit Card",
              //     status: 1,
              //   },
              // });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Credit Card",
                  bankId: report.bankId,
                  status: 1,
                },
                orderBy: {
                  createdAt: "asc",
                },
              });

              form = {
                ...creditCardForm,
                // ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Loan") {
              const LoanForm = await prisma.loanForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              // const { id, ...otherPropertiesOfLoanForm } = LoanForm;

              // const bankStatus = await prisma.bankStatus.findFirst({
              //   where: {
              //     formId: report.formId,
              //     formType: "Loan",
              //     status: 1,
              //   },
              // });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Loan",
                  bankId: report.bankId,
                  status: 1,
                },
                orderBy: {
                  createdAt: "asc",
                },
              });

              form = {
                // ...otherPropertiesOfLoanForm,
                ...LoanForm,
                // ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Insurance") {
              const insuranceForm = await prisma.insuranceForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              // const { id, ...otherPropertiesOfInsuranceForm } = insuranceForm;

              // const bankStatus = await prisma.bankStatus.findFirst({
              //   where: {
              //     formId: report.formId,
              //     formType: "Insurance",
              //     status: 1,
              //   },
              // });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Insurance",
                  bankId: report.bankId,
                  status: 1,
                },
                orderBy: {
                  createdAt: "asc",
                },
              });

              form = {
                // ...otherPropertiesOfInsuranceForm,
                ...insuranceForm,
                // ...bankStatus,
                previousBankStatuses,
              };
            } else if (report.formType === "Demat Account") {
              const DematAccountForm = await prisma.dematAccountForm.findFirst({
                where: {
                  id: report.formId,
                  status: 1,
                },
              });

              // const { id, ...otherPropertiesDematAccountForm } =
              //   DematAccountForm;

              // const bankStatus = await prisma.bankStatus.findFirst({
              //   where: {
              //     formId: report.formId,
              //     formType: "Demat Account",
              //     status: 1,
              //   },
              // });

              const previousBankStatuses = await prisma.bankStatus.findMany({
                where: {
                  formId: report.formId,
                  formType: "Demat Account",
                  bankId: report.bankId,
                  status: 1,
                },
                orderBy: {
                  createdAt: "asc",
                },
              });

              form = {
                // ...otherPropertiesDematAccountForm,
                ...DematAccountForm,
                // ...bankStatus,
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
      const { bankId, formId, formType, comment, bankStatus, applicationNo } =
        req.body;

      if (loggedInUser) {
        const formAlreadyExist = await prisma.bankStatus.findFirst({
          where: {
            formId: parseInt(formId),
            formType,
            bankId: parseInt(bankId),
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
          // delete previous bankStatus
          // await prisma.bankStatus.update({
          //   where: {
          //     id: formAlreadyExist.id,
          //   },
          //   data: {
          //     status: 0,
          //   },
          // });

          const updatedBankStatus = await prisma.bankStatus.create({
            data: {
              formId: parseInt(formId),
              formType,
              bankId: parseInt(bankId),
              comment,
              bankStatus,
              applicationNo,
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

          const previousBankStatuses = await prisma.bankStatus.findMany({
            where: {
              formId: parseInt(formId),
              formType,
            },
          });

          response.success(res, "Form status updated!", {
            updatedBankStatus: { ...updatedBankStatus, previousBankStatuses },
          });
        } else {
          const updatedBankStatus = await prisma.bankStatus.create({
            data: {
              formId: parseInt(formId),
              formType,
              bankId: parseInt(bankId),
              comment,
              bankStatus,
              applicationNo,
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

          const previousBankStatuses = await prisma.bankStatus.findMany({
            where: {
              formId: parseInt(formId),
              formType,
            },
          });

          response.success(res, "Form status updated!", {
            updatedBankStatus: { ...updatedBankStatus, previousBankStatuses },
          });
        }
      }
    } catch (error) {
      console.log("error while fetching reports data ->", error);
    }
  }

  async reportUploadUpdateStatusWithFile(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      const { bankId } = req.body;
      const { buffer } = req.file;

      if (loggedInUser) {
        const workbook = xlsx.read(buffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const allBankStatusUpdate = await Promise.all(
          jsonData?.map(async (status) => {
            const formStatus = await prisma.formStatus.findFirst({
              where: {
                applicationNo: String(status.applicationNo),
              },
            });

            const updatedBankStatus = await prisma.bankStatus.create({
              data: {
                applicationNo: String(status.applicationNo),
                comment: status.comment,
                bankStatus: status.bankStatus,
                formType: "Credit Card",
                formId: formStatus.formId,
                bankId: parseInt(bankId),
              },
            });

            const updateFormStatus = await prisma.formStatus.update({
              where: {
                id: formStatus.id,
              },
              data: {
                bankStatus: updatedBankStatus.bankStatus,
              },
            });

            return updatedBankStatus;
          })
        );

        response.success(res, "Status updated through file data", {
          allBankStatusUpdate,
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

        const searchCondition = {
          status: 1,
          OR: [],
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

        const filteredReportUpload = await prisma.creditCardForm.findMany({
          where: searchCondition,
        });

        response.success(res, "Fetched reports upload!", {
          reportUpload: filteredReportUpload,
        });
      } else {
        response.error(res, "User not logged in!");
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

        const updatedBankStatus = await prisma.bankStatus.findMany({
          where: {
            formType: deletedBankStatus.formType,
            formId: parseInt(deletedBankStatus.formId),
            status: 1,
          },
          orderBy: {
            createdAt: "asc",
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
            bankStatus:
              updatedBankStatus.length > 0
                ? updatedBankStatus[updatedBankStatus.length - 1].bankStatus
                : null,
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
