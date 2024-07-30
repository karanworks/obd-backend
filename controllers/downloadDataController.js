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
  async downloadAllData(req, res) {
    try {
      const loggedInUser = await getLoggedInUser(req, res);
      if (loggedInUser) {
        console.time("DATA COUNT TIME");
        const groupedData = await prisma.$queryRaw`
        SELECT state, stateId, 
               COUNT(DISTINCT cityId) AS CityCount, 
               COUNT(id) as TotalDataCount
        FROM rawformdata
        GROUP BY stateId;
      `;

        // console.time("FORM DATA TIME");

        const formDataPromises = groupedData.map(async (item) => {
          const formData = await prisma.rawFormData.findMany({
            where: {
              stateId: item.stateId,
            },
            select: {
              name: true,
              email: true,
              mobile1: true,
              city: true,
              state: true,
              pinCode: true,
              salary: true,
            },
          });

          return {
            state: item.state,
            stateId: item.stateId,
            cityCount: Number(item.CityCount),
            totalDataCount: Number(item.TotalDataCount),
            formData,
          };
        });

        const result = await Promise.all(formDataPromises);

        console.timeEnd("DATA COUNT TIME");
        console.log(result);

        // console.timeEnd("FORM DATA TIME");

        response.success(res, "All data fetched!", { allData: result });
      } else {
        response.error(res, "User not already logged in.");
      }
    } catch (error) {
      console.log("Error while getting users", error);
      response.error(res, "Error while fetching data.");
    }
  }

  // async downloadAllData(req, res) {
  //   try {
  //     const loggedInUser = await getLoggedInUser(req, res);
  //     if (loggedInUser) {
  //       const result = await prisma.$queryRaw`
  //       SELECT state, stateId,
  //              COUNT(DISTINCT cityId) AS CityCount,
  //              COUNT(id) as TotalDataCount
  //       FROM rawformdata
  //       GROUP BY stateId;
  //     `;

  //       console.log("RESULT DATA ->", result);

  //       // In Prisma, counts are returned as bigint, so we need to convert them to integers
  //       const resultWithData = await Promise.all(
  //         result.map(async (row) => {
  //           const state = row.state;
  //           const stateId = row.stateId;
  //           let rawData;

  //           if (stateId) {
  //             rawData = await prisma.$queryRaw`
  //                 SELECT name, email, mobile1, city, state, pinCode, salary
  //                 FROM rawformdata
  //                 WHERE stateId = ${stateId};
  //               `;
  //           } else {
  //             rawData = await prisma.$queryRaw`
  //             SELECT name, email, mobile1, city, state, pinCode, salary
  //             FROM rawformdata
  //             WHERE stateId IS NULL;
  //           `;
  //           }

  //           return {
  //             state,
  //             stateId,
  //             cityCount: Number(row.CityCount),
  //             totalDataCount: Number(row.TotalDataCount),
  //             formData: rawData,
  //           };
  //         })
  //       );

  //       console.log("RESULT WITH DATA ->", resultWithData);

  //       response.success(res, "All data fetched!", { allData: resultWithData });
  //     } else {
  //       response.error(res, "User not already logged in.");
  //     }
  //   } catch (error) {
  //     console.log("Error while getting users", error);
  //     response.error(res, "Error while fetching data.");
  //   }
  // }
}

module.exports = new DownloadDataController();
