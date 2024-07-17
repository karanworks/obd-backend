const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class UploadRawDataController {
  async uploadRawDataPost(req, res) {
    try {
      const { vendorName, dataType, purchaseDate } = req.body;

      console.log("UPLOAD RAW DATA ->", req.body);

      const loggedInUser = await getLoggedInUser(req, res);

      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const { buffer } = req.file;

      console.log("YUP RECEIVED THE FILE AS WELL ->", buffer.toString());

      if (loggedInUser) {
        response.success(res, "Data uploaded successfully!");
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  }
}

module.exports = new UploadRawDataController();
