const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class BankCodeController {
  async bankCodesGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
          include: {
            bankCodes: true,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Bank Codes fetched!", {
          ...adminDataWithoutPassword,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting bank codes ", error);
    }
  }

  async bankCodeCreatePost(req, res) {
    try {
      const { centerName, bankName, userNameCode, password } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const newUser = await prisma.bankCode.create({
          data: {
            centerName,
            bankName,
            userNameCode,
            password,
            addedBy: loggedInUser.id,
          },
        });

        response.success(res, "Bank code registered successfully!", newUser);
      }
    } catch (error) {
      console.log("error while bank code registration ->", error);
    }
  }

  async bankCodeUpdatePatch(req, res) {
    try {
      const { centerName, bankName, userNameCode, password } = req.body;

      const { bankCodeId } = req.params;

      const bankCodeFound = await prisma.bankCode.findFirst({
        where: {
          id: parseInt(bankCodeId),
        },
      });

      if (bankCodeFound) {
        const updatedBankCode = await prisma.bankCode.update({
          where: {
            id: parseInt(bankCodeId),
          },
          data: {
            centerName,
            bankName,
            userNameCode,
            password,
          },
        });

        response.success(res, "Bank Code updated successfully!", {
          updatedBankCode,
        });
      } else {
        response.error(res, "Bank Code not found!");
      }
    } catch (error) {
      console.log("error while updating bank code controller", error);
    }
  }

  async bankCodeRemoveDelete(req, res) {
    try {
      const { bankCodeId } = req.params;

      const bankCodeFound = await prisma.bankCode.findFirst({
        where: {
          id: parseInt(bankCodeId),
        },
      });

      if (bankCodeFound) {
        const deletedBankCode = await prisma.bankCode.delete({
          where: {
            id: parseInt(bankCodeId),
          },
        });

        response.success(res, "bank Code deleted successfully!", {
          deletedBankCode,
        });
      } else {
        response.error(res, "bank codes does not exist! ");
      }
    } catch (error) {
      console.log("error while deleting bank code ", error);
    }
  }
}

module.exports = new BankCodeController();
