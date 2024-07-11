const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class LoanFormController {
  async loanFormsGet(req, res) {
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

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Credit Card Forms fetched!", {
            ...adminDataWithoutPassword,
            forms,
          });
        } else {
          const forms = await prisma.form.findMany({
            where: {
              addedBy: loggedInUser.id,
              status: 1,
            },
          });

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Credit Card Forms fetched!", {
            ...adminDataWithoutPassword,
            forms,
          });
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting loan forms ", error);
    }
  }

  async loanFormCreatePost(req, res) {
    try {
      const {
        employeeType,
        loanType,
        name,
        mobileNo,
        currentAddress,
        pinCode,
        income,
        panNo,
        formType,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const centerUser = await prisma.centerUser.findFirst({
          where: {
            email: loggedInUser.email,
          },
        });

        const formCreated = await prisma.loanForm.create({
          data: {
            employeeType,
            loanType,
            fullName: name,
            mobileNo,
            currentAddress,
            pinCode,
            income,
            panNo,
            addedBy: centerUser.id,
          },
        });

        await prisma.formStatus.create({
          data: {
            formId: formCreated.id,
            applicationNo: "",
            formStatus: "",
            formType,
            addedBy: centerUser.id,
          },
        });

        response.success(res, "Loan Form submitted successfully!", formCreated);
      }
    } catch (error) {
      console.log("error while loan form submission ->", error);
    }
  }
}

module.exports = new LoanFormController();
