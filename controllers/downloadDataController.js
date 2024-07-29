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
        if (email === "Yes") {
          conditions.push(`RawFormData.email IS NOT NULL`);
          // params.push(email);
        } else if (email === "No") {
          conditions.push(
            `(RawFormData.email IS NULL OR RawFormData.email = '')`
          );
        }
        if (salary) {
          conditions.push(`RawFormData.salary = ?`);
          params.push(salary);
        }
        if (ringing === "Yes") {
          conditions.push(`OBDData.ringTime IS NOT NULL`);
          // params.push(ringing);
        }
        if (talked === "Yes") {
          conditions.push(`OBDData.talkTime IS NOT NULL`);
          // params.push(talked);
        }
        if (keyPress === "Yes") {
          conditions.push(`OBDData.dtmfKeyPress IS NOT NULL`);
          // params.push(keyPress);
        }

        const whereClause = conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : "";

        console.log("PARAMS ->", params);
        const query = `
        SELECT RawFormData.id, RawFormData.mobile1, RawFormData.name, RawFormData.city, RawFormData.state, RawFormData.pinCode, RawFormData.salary, RawFormData.email, OBDData.ringTime 
        FROM RawFormData
        INNER JOIN OBDData ON OBDData.number = RawFormData.mobile1
        ${whereClause}
      `;

        // Use Prisma's queryRaw with parameterized values
        const filteredData = await prisma.$queryRawUnsafe(query, ...params);

        response.success(res, "Data filtered!", filteredData);
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("error while getting users", error);
    }
  }
}

module.exports = new DownloadDataController();
