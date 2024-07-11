const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class InsuranceFormController {
  async insuranceFormsGet(req, res) {
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

          response.success(res, "Insurance Forms fetched!", {
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

          response.success(res, "Insurance Forms fetched!", {
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
      console.log("error while getting insurance forms ", error);
    }
  }
  async insuranceFormCreatePost(req, res) {
    try {
      const {
        employeeType,
        insuranceType,
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

        const formCreated = await prisma.insuranceForm.create({
          data: {
            employeeType,
            insuranceType,
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

        response.success(
          res,
          "Insurance Form submitted successfully!",
          formCreated
        );
      }
    } catch (error) {
      console.log("error while insurance form submission ->", error);
    }
  }
}

module.exports = new InsuranceFormController();
