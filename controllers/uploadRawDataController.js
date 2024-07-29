const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");
const { time } = require("console");

class UploadRawDataController {
  uploadRawDataPost = async (req, res) => {
    try {
      const { vendorName, dataType, purchaseDate } = req.body;
      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        if (!req.file) {
          return res.status(400).send("No file uploaded.");
        }

        const { buffer } = req.file;

        const workbook = xlsx.read(buffer, { type: "buffer" });

        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const recordsData = jsonData
          .map((record) => {
            const mobileNos =
              record.tel_Other && this.getNumbers(record.tel_Other);

            if (!record.tel_Other) {
              return null;
            }

            if (mobileNos?.length > 0 && !mobileNos[0]) {
              // console.log("Skipping record due to missing mobile number.");
              return null;
            }

            // return {
            //   name: String(record.candidateName) || "",
            //   email: String(record.emailAddress) || "",
            //   company: String(record.companyName) || "",
            //   departmentPosition: String(record.designation) || "",
            //   salary: String(record.salary) || "",
            //   city: String(record.locationCurrentMas) || "",
            //   mobile1: mobileNos[0],
            //   mobile2: mobileNos[1],
            //   mobile3: mobileNos[2],
            //   dataType,
            //   vendor: vendorName,
            //   purchaseDate: purchaseDate[0],
            //   addedBy: loggedInUser.id,
            // };
            return {
              name: record.candidateName ? String(record.candidateName) : "",
              email: record.emailAddress ? String(record.emailAddress) : "",
              company: record.companyName ? String(record.companyName) : "",
              departmentPosition: record.designation
                ? String(record.designation)
                : "",
              salary: record.salary ? String(record.salary) : "",
              city: record.locationCurrentMas
                ? String(record.locationCurrentMas)
                : "",
              mobile1: mobileNos[0],
              mobile2: mobileNos[1],
              mobile3: mobileNos[2],
              dataType,
              vendor: vendorName,
              purchaseDate: purchaseDate[0],
              addedBy: loggedInUser.id,
            };
          })
          .filter(Boolean);

        const uniqueRecords = this.filterUniqueRecords(recordsData);

        await prisma.rawFormData.createMany({
          data: uniqueRecords,
          skipDuplicates: true,
        });

        response.success(res, "Data uploaded successfully!");
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  };

  getNumbers(numberString) {
    const separatedMobileNos = numberString.toString().split(";");
    const mobileNos = [];

    const firstMobileNoRegex = /\d{10}/g;
    const firstMobileNo = separatedMobileNos[0].match(firstMobileNoRegex);

    if (firstMobileNo?.length > 0) {
      mobileNos.push(firstMobileNo[0]);
    } else {
      mobileNos.push(null);
    }

    const secondMobileNo = this.extractNumbers(separatedMobileNos[1]);
    const thirdMobileNo = this.extractNumbers(separatedMobileNos[2]);

    mobileNos.push(secondMobileNo);
    mobileNos.push(thirdMobileNo);

    return mobileNos;
  }

  extractNumbers(numberString) {
    const regex = /[^0-9]+/;
    const mobileNoExtraction =
      Boolean(numberString) && numberString?.split(regex)?.filter(Boolean);

    const lastSectionDigits =
      mobileNoExtraction[mobileNoExtraction?.length - 1];

    const lastSectionDigitsLength = lastSectionDigits?.length;

    if (mobileNoExtraction?.length > 0) {
      if (lastSectionDigitsLength === 10) {
        return lastSectionDigits;
      } else if (lastSectionDigitsLength < 7) {
        // this make sures random numbers doesn't pass this (there are numbers which only has "91", "91-91" etc)
        return null;
      } else {
        return numberString;
      }
    } else {
      return null;
    }
  }

  filterUniqueRecords(records) {
    const seenMobileNumbers = new Set();

    return records.filter((record) => {
      const { mobile1, mobile2, mobile3 } = record;
      const mobiles = [mobile1, mobile2, mobile3];

      // Check if any of the non-null mobile numbers are already seen
      const isDuplicate = mobiles.some(
        (mobile) => mobile !== null && seenMobileNumbers.has(mobile)
      );

      // If it's not a duplicate, add these non-null numbers to the set
      if (!isDuplicate) {
        mobiles.forEach((mobile) => {
          if (mobile !== null) {
            seenMobileNumbers.add(mobile);
          }
        });
        return true;
      }

      return false;
    });
  }
}

module.exports = new UploadRawDataController();
