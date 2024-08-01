const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getToken = require("../utils/getToken");
const getLoggedInUser = require("../utils/getLoggedInUser");

class DataCorrectionController {
  async dataCorrectionGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const city = await prisma.rawFormData.groupBy({
          by: ["city"],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          where: {
            cityId: null,
          },

          take: 1,
        });
        const salary = await prisma.rawFormData.groupBy({
          by: ["salary"],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          where: {
            salaryInNumbers: null,
            salary: {
              not: {
                in: ["", "undefined"],
              }, // Ensures salary is not an empty string
            },
          },

          take: 1,
        });

        response.success(res, "Current city with count fetched!", {
          currentCity: city,
          currentSalary: salary,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
  async cityDataCorrectionUpdate(req, res) {
    try {
      const token = await getToken(req, res);
      const { cityId, stateId, cityName, pinCode } = req.body;

      if (token) {
        const stateName = await prisma.states.findFirst({
          where: {
            id: stateId,
          },
        });

        await prisma.rawFormData.updateMany({
          where: {
            city: cityName,
          },
          data: { cityId, stateId, pinCode, state: stateName.name },
        });

        response.success(res, "City details updated!");
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }

  async salaryDataCorrectionUpdate(req, res) {
    try {
      const token = await getToken(req, res);
      const { salaryInNumbers, currentSalary } = req.body;

      if (token) {
        await prisma.rawFormData.updateMany({
          where: {
            salary: currentSalary,
          },
          data: { salaryInNumbers: parseInt(salaryInNumbers) },
        });

        response.success(res, "Salary details updated!");
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }

  async salaryInLacsGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const salaryInLacs = await prisma.salaryInLacs.findMany({});

        response.success(res, "Salary in lacs fetched!", {
          salaryInLacs,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
  async salaryInThousandsGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const salaryInThousands = await prisma.salaryInThousands.findMany({});

        response.success(res, "Salary in thousands fetched!", {
          salaryInThousands,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }

  async statesGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const states = await prisma.states.findMany({});

        response.success(res, "States fetched!", {
          states,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
  async citiesGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      const { stateId } = req.params;

      if (loggedInUser) {
        const cities = await prisma.cities.findMany({
          where: {
            stateId: parseInt(stateId),
          },
        });

        response.success(res, "Cities fetched!", {
          cities,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
  async pinCodesGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      const { cityId } = req.params;

      if (loggedInUser) {
        const pinCodes = await prisma.pinCode.findMany({
          where: {
            cityId: parseInt(cityId),
          },
        });

        response.success(res, "Pin Codes fetched!", {
          pinCodes,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
}

module.exports = new DataCorrectionController();
