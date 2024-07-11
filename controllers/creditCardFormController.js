const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class CreditCardFormController {
  async creditCardFormsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        if (loggedInUser.roleId === 1) {
          const forms = await prisma.creditCardForm.findMany({
            where: {
              status: 1,
            },
          });

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
            ...adminDataWithoutPassword,
            forms,
          });
        } else {
          const forms = await prisma.creditCardForm.findMany({
            where: {
              addedBy: loggedInUser.id,
              status: 1,
            },
          });

          const { password, ...adminDataWithoutPassword } = loggedInUser;

          response.success(res, "Forms fetched!", {
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
      console.log("error while getting credit card forms ", error);
    }
  }

  async creditCardFormCreatePost(req, res) {
    try {
      const {
        employeeName,
        bankName,
        clientType,
        fullName,
        mobileNo,
        email,
        currentAddress,
        pinCode,
        dob,
        motherName,
        fatherName,
        companyName,
        companyAddress,
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

        const formCreated = await prisma.creditCardForm.create({
          data: {
            employeeName,
            bankName,
            clientType,
            fullName,
            mobileNo,
            email,
            currentAddress,
            pinCode,
            dob,
            motherName,
            fatherName,
            companyName,
            companyAddress,
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

        response.success(res, "Form submitted successfully!", formCreated);
      }
    } catch (error) {
      console.log("error while credit card form submission ->", error);
    }
  }
}

module.exports = new CreditCardFormController();
