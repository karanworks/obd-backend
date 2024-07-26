const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const fs = require("fs");

class DownloadDataController {
  async downloadDataFilter(req, res) {
    try {
      const {
        vendor,
        stateId,
        cityId,
        pinCode,
        email,
        salary,
        ringing,
        talked,
        keyPress,
      } = req.body;

      console.log("DOWNLOAD DATA FILTER API CALLED ->", req.body);

      const loggedInUser = await getLoggedInUser(req, res);
      if (loggedInUser) {
        const conditions = [];
        const params = [];

        if (vendor) {
          conditions.push(`RawFormData.vendor = ?`);
          params.push(vendor);
        }
        if (stateId) {
          conditions.push(`RawFormData.stateId = ?`);
          params.push(stateId);
        }
        if (cityId) {
          conditions.push(`RawFormData.cityId = ?`);
          params.push(cityId);
        }
        if (pinCode) {
          conditions.push(`RawFormData.pinCode = ?`);
          params.push(pinCode);
        }
        if (email) {
          conditions.push(`RawFormData.email = ?`);
          params.push(email);
        }
        if (salary) {
          conditions.push(`RawFormData.salary = ?`);
          params.push(salary);
        }
        if (ringing) {
          conditions.push(`OBDData.ringing = ?`);
          params.push(ringing);
        }
        if (talked) {
          conditions.push(`OBDData.talked = ?`);
          params.push(talked);
        }
        if (keyPress) {
          conditions.push(`OBDData.keyPress = ?`);
          params.push(keyPress);
        }

        const whereClause = conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : "";

        const query = `
        SELECT RawFormData.mobile1, RawFormData.name, OBDData.ringTime 
        FROM RawFormData
        INNER JOIN OBDData ON OBDData.number = RawFormData.mobile1
        ${whereClause}
      `;

        // Use Prisma's queryRaw with parameterized values
        const filteredData = await prisma.$queryRawUnsafe(query, ...params);

        console.log("FILTERED DATA ->", filteredData);

        response.success(res, "Data filtered!");
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
}

module.exports = new DownloadDataController();
