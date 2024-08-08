const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class BankDropdownControlelr {
  async bankDropdownsGet(req, res) {
    try {
      const loggedInUser = getLoggedInUser(req, res);

      if (loggedInUser) {
        const bankDropdowns = await prisma.dropdown.findMany({
          where: {
            type: "Bank",
            status: 1,
          },
          orderBy: {
            sequence: "asc",
          },
        });

        response.success(res, "Bank dropdowns fetched!", {
          bankDropdowns,
        });
      } else {
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting bank codes ", error);
    }
  }
}

module.exports = new BankDropdownControlelr();
