const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");

class DailyReportUploadController {
  dailyReportUploadGet = async (req, res) => {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const groupedDataByDate = await prisma.dailyDialerReport.groupBy({
          by: ["createdAt"],
          _count: true,
        });

        response.success(res, "Data Report Uploaded successfully!", {
          groupedDataByDate,
        });
      }
    } catch (error) {
      console.log("error while daily report upload  ->", error);
    }
  };

  dailyReportUploadPost = async (req, res) => {
    try {
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        if (!req.file) {
          return res.status(400).send("No file uploaded.");
        }
        const { buffer } = req.file;

        const workbook = xlsx.read(buffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const dataToUpload = jsonData.map((data) => ({
          campaign: data.Campaign,
          agentId: data["Agent ID"],
          agentName: data["Agent Name"],
          sip: data.Sip,
          phoneNumber: String(data["Phone Number"]),
          callType: data["Call Type"],
          startTime: data["Start Time"],
          endTime: data["End Time"],
          callHandlingTime: data["Call Handling Time"],
          talkTime: data["Talk Time"],
          wrapupDuration: data["Wrapup Duration"],
          disposition: data["Disposition"],
          subDisposition: data["Sub Disposition"],
        }));

        await prisma.dailyDialerReport.createMany({
          data: dataToUpload,
        });

        response.success(res, "Data Report Uploaded successfully!");
      }
    } catch (error) {
      console.log("error while daily report upload  ->", error);
    }
  };
}

module.exports = new DailyReportUploadController();
