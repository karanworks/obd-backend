const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const fs = require("fs");

class OBDDataController {
  async downloadDataForOBDGet(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      if (loggedInUser) {
        const dataForOBD = await prisma.$queryRaw`
        SELECT RawFormData.mobile1 FROM RawFormData 
        LEFT JOIN OBDData ON OBDData.number = RawFormData.mobile1
        WHERE OBDData.number IS NULL
        `;

        console.log("DATA FOR OBD ->", dataForOBD);

        const csvWriter = createCsvWriter({
          path: "data-for-obd.csv", // Path to the CSV file
          header: [{ id: "mobile1", title: "Mobile Numbers" }],
        });

        csvWriter
          .writeRecords(dataForOBD)
          .then(() => {
            const filePath = path.join("./", "data-for-obd.csv");

            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
              "Content-Disposition",
              "attachment; filename=data-for-obd.csv"
            );

            res.download(filePath, "data-for-obd.csv", (err) => {
              if (err) {
                console.error("Error sending CSV file:", err);
                res.status(500).send("Error sending CSV file");
              } else {
                console.log("CSV file sent successfully!");
                fs.unlink(filePath, (err) => {
                  if (err) {
                    console.error("Error deleting CSV file:", err);
                  } else {
                    console.log("CSV file deleted successfully!");
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("Error writing CSV file:", error);
            res.status(500).send("Error writing CSV file");
          });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
}

module.exports = new OBDDataController();
