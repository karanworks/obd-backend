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

        response.success(res, "Current city with count fetched!", {
          currentCity: city,
        });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
  async dataCorrectionUpdate(req, res) {
    try {
      const token = await getToken(req, res);
      const { cityId, stateId, cityName, pinCode } = req.body;

      if (token) {
        // update city's city id and pin code
        await prisma.rawFormData.updateMany({
          where: {
            city: cityName,
          },
          data: { cityId, stateId, pinCode },
        });

        response.success(res, "City details updated!");
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
