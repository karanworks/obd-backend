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

        const formStatusForPending = await prisma.formStatus.findMany({
          where: {
            OR: [
              { formStatus: "Link Sent" },
              { formStatus: "" },
              { formStatus: "Shared To Bank" },
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const formStatusForUpdated = await prisma.formStatus.findMany({
          where: {
            OR: [
              { formStatus: "Declined" },
              { formStatus: "Already Applied" },
              { formStatus: "Re-Process" },
              { formStatus: "Client Declined" },
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (loggedInUser.roleId === 1) {
          const formWithStatusAndApplicationNoForPending = await Promise.all(
            formStatusForPending.map(async (fStatus) => {
              let form;

              if (fStatus.formType === "Credit Card") {
                form = await prisma.creditCardForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Loan") {
                form = await prisma.loanForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Insurance") {
                form = await prisma.insuranceForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Demat Account") {
                form = await prisma.dematAccountForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              }

              return {
                ...form,
                formStatus: fStatus.formStatus,
                applicationNo: fStatus.applicationNo,
                formType: fStatus.formType,
              };
            })
          );
          const formWithStatusAndApplicationNoForUpdated = await Promise.all(
            formStatusForUpdated.map(async (fStatus) => {
              let form;
              if (fStatus.formType === "Credit Card") {
                form = await prisma.creditCardForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Loan") {
                form = await prisma.loanForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Insurance") {
                form = await prisma.insuranceForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              } else if (fStatus.formType === "Demat Account") {
                form = await prisma.dematAccountForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                  },
                });
              }

              return {
                ...form,
                formStatus: fStatus.formStatus,
                applicationNo: fStatus.applicationNo,
                formType: fStatus.formType,
              };
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            pendingForms: formWithStatusAndApplicationNoForPending,
            updatedForms: formWithStatusAndApplicationNoForUpdated,
          });
        } else {
          const formWithStatusAndApplicationNoForPending = await Promise.all(
            formStatusForPending.map(async (fStatus) => {
              let form;
              if (fStatus.formType === "Credit Card") {
                form = await prisma.creditCardForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Loan") {
                form = await prisma.loanForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Insurance") {
                form = await prisma.insuranceForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Demat Account") {
                form = await prisma.dematAccountForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              }

              return {
                ...form,
                formStatus: fStatus.formStatus,
                applicationNo: fStatus.applicationNo,
                formType: fStatus.formType,
              };
            })
          );
          const formWithStatusAndApplicationNoForUpdated = await Promise.all(
            formStatusForUpdated.map(async (fStatus) => {
              let form;
              if (fStatus.formType === "Credit Card") {
                form = await prisma.creditCardForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Loan") {
                form = await prisma.loanForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Insurance") {
                form = await prisma.insuranceForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              } else if (fStatus.formType === "Demat Account") {
                form = await prisma.dematAccountForm.findFirst({
                  where: {
                    id: fStatus.formId,
                    status: 1,
                    addedBy: loggedInUser.id,
                  },
                });
              }

              return {
                ...form,
                formStatus: fStatus.formStatus,
                applicationNo: fStatus.applicationNo,
                formStatus: fStatus.formStatus,
              };
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            pendingForms: formWithStatusAndApplicationNoForPending,
            updatedForms: formWithStatusAndApplicationNoForUpdated,
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

  async pendingFormsFilter(req, res) {
    try {
      const { date, searchQuery } = req.body;

      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const formStatusForPending = await prisma.formStatus.findMany({
          where: {
            OR: [{ formStatus: "Link Sent" }, { formStatus: "" }],
          },
        });
        const formStatusForUpdated = await prisma.formStatus.findMany({
          where: {
            OR: [
              { formStatus: "Declined" },
              { formStatus: "Already Applied" },
              { formStatus: "Re-Process" },
              { formStatus: "Client Declined" },
            ],
          },
        });

        if (loggedInUser.roleId === 1) {
          const formWithStatusAndApplicationNoForPending = await Promise.all(
            formStatusForPending.map(async (fStatus) => {
              const form = await prisma.creditCardForm.findFirst({
                where: {
                  id: fStatus.formId,
                  status: 1,
                  OR: [
                    { fullName: { contains: searchQuery } },
                    { bankName: { contains: searchQuery } },
                    {
                      createdAt: {
                        gte: new Date(date?.length > 0 && date[0]),
                        lte: new Date(date?.length > 0 && date[1]),
                      },
                    },
                  ],
                },
              });

              if (form) {
                return {
                  ...form,
                  formStatus: fStatus.formStatus,
                  applicationNo: fStatus.applicationNo,
                };
              }
            })
          ).then((res) => res.filter(Boolean));
          const formWithStatusAndApplicationNoForUpdated = await Promise.all(
            formStatusForUpdated.map(async (fStatus) => {
              const form = await prisma.creditCardForm.findFirst({
                where: {
                  id: fStatus.formId,
                  status: 1,
                  OR: [
                    { fullName: { contains: searchQuery } },
                    { bankName: { contains: searchQuery } },
                    {
                      createdAt: {
                        gte: new Date(date?.length > 0 && date[0]),
                        lte: new Date(date?.length > 0 && date[1]),
                      },
                    },
                  ],
                },
              });

              if (form) {
                return {
                  ...form,
                  formStatus: fStatus.formStatus,
                  applicationNo: fStatus.applicationNo,
                };
              }
            })
          ).then((res) => res.filter(Boolean));

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            pendingForms: formWithStatusAndApplicationNoForPending,
            updatedForms: formWithStatusAndApplicationNoForUpdated,
          });
        } else {
          const formWithStatusAndApplicationNoForPending = await Promise.all(
            formStatusForPending.map(async (fStatus) => {
              const form = await prisma.creditCardForm.findFirst({
                where: {
                  id: fStatus.formId,
                  status: 1,
                  addedBy: loggedInUser.id,
                },
              });

              if (form) {
                return {
                  ...form,
                  formStatus: fStatus.formStatus,
                  applicationNo: fStatus.applicationNo,
                };
              }
            })
          );
          const formWithStatusAndApplicationNoForUpdated = await Promise.all(
            formStatusForUpdated.map(async (fStatus) => {
              const form = await prisma.creditCardForm.findFirst({
                where: {
                  id: fStatus.formId,
                  status: 1,
                  addedBy: loggedInUser.id,
                },
              });
              if (form) {
                return {
                  ...form,
                  formStatus: fStatus.formStatus,
                  applicationNo: fStatus.applicationNo,
                };
              }
            })
          );

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            pendingForms: formWithStatusAndApplicationNoForPending,
            updatedForms: formWithStatusAndApplicationNoForUpdated,
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
