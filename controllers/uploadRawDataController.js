const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");
const fs = require("fs");
const { error } = require("console");

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

        console.time("CONVERSION TIME");
        // Convert xlsx buffer to workbook
        const workbook = xlsx.read(buffer, { type: "buffer" });

        // Convert first sheet to CSV
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

            return {
              name: String(record.candidateName) || "",
              email: String(record.emailAddress) || "",
              company: String(record.companyName) || "",
              departmentPosition: String(record.designation) || "",
              salary: String(record.salary) || "",
              state: String(record.locationCurrentMas) || "",
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
        console.timeEnd("CONVERSION TIME");

        console.time("QUERY TIME");
        await prisma.rawFormData.createMany({
          data: uniqueRecords,
        });

        console.timeEnd("QUERY TIME");

        response.success(res, "Data uploaded successfully!");
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  };

  getNumbers(numberString) {
    const separatedMobileNos = numberString.toString().split(";");

    const firstMobileNoRegex = /\d{10}/g;
    const firstMobileNo = separatedMobileNos[0].match(firstMobileNoRegex);

    const secondMobileNoRegex = /[^0-9]+/;
    const secondMobileNoExtraction =
      Boolean(separatedMobileNos[1]) &&
      separatedMobileNos[1]?.split(secondMobileNoRegex)?.filter(Boolean);

    const lastSectionDigits =
      secondMobileNoExtraction[secondMobileNoExtraction?.length - 1];

    const lastSectionDigitsLength = lastSectionDigits?.length;

    const thirdMobileNoRegex = /[^0-9]+/;
    const thirdMobileNoExtraction =
      Boolean(separatedMobileNos[2]) &&
      separatedMobileNos[2]?.split(thirdMobileNoRegex)?.filter(Boolean);

    const thirdNumberLastSectionDigits =
      thirdMobileNoExtraction[thirdMobileNoExtraction?.length - 1];

    const thirdNumberLastSectionDigitsLength =
      thirdNumberLastSectionDigits?.length;

    let mobileNos = [];

    // for first mobile no
    if (firstMobileNo?.length > 0) {
      mobileNos.push(firstMobileNo[0]);
    } else {
      mobileNos.push(null);
    }

    // this ensures that if second no exists (there are some cases where only 1 no is present)
    // for second mobile no
    if (secondMobileNoExtraction?.length > 0) {
      if (lastSectionDigitsLength === 10) {
        mobileNos.push(lastSectionDigits);
      } else if (lastSectionDigitsLength < 7) {
        // this make sures random doesn't pass this (there are numbers which only has "91", "91-91" etc)
        mobileNos.push(null);
      } else {
        mobileNos.push(separatedMobileNos[1]);
      }
    } else {
      mobileNos.push(null);
    }

    // for third mobile no
    if (thirdMobileNoExtraction?.length > 0) {
      if (thirdNumberLastSectionDigitsLength === 10) {
        mobileNos.push(thirdNumberLastSectionDigits);
      } else if (thirdNumberLastSectionDigitsLength < 7) {
        // this make sures random doesn't pass this (there are numbers which only has "91", "91-91" etc)
        mobileNos.push(null);
      } else {
        mobileNos.push(separatedMobileNos[2]);
      }
    } else {
      mobileNos.push(null);
    }

    return mobileNos;
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

// getNumbers(numberString) {
//   const separatedMobileNos = numberString.split(";");

//   const firstMobileNoRegex = /\d{10}/g;
//   const firstMobileNo = separatedMobileNos[0].match(firstMobileNoRegex);

//   const secondMobileNo = this.extractNumbers(
//     separatedMobileNos[1],
//     /[^0-9]+/
//   );
//   const thirdMobileNo = this.extractNumbers(separatedMobileNos[2], /[^0-9]+/);

//   let mobileNos = [];

//   if (firstMobileNo?.length > 0) {
//     mobileNos.push(firstMobileNo[0]);
//   } else {
//     mobileNos.push(null);
//   }

//   mobileNos.push(secondMobileNo);
//   mobileNos.push(thirdMobileNo);

//   return mobileNos;
// }

// extractNumbers(numberArray, regex) {
//   if (numberArray?.length > 0) {
//     const mobileNoExtraction =
//       Boolean(numberArray[1]) &&
//       numberArray[1]?.split(regex)?.filter(Boolean);

//     const lastSectionDigits = numberArray[numberArray?.length - 1];

//     const lastSectionDigitsLength = lastSectionDigits?.length;

//     if (mobileNoExtraction?.length > 0) {
//       if (lastSectionDigitsLength === 10) {
//         return lastSectionDigits;
//       } else if (lastSectionDigitsLength < 7) {
//         return null;
//       } else {
//         return separatedMobileNos[1];
//       }
//     } else {
//       return null;
//     }
//   }
// }
module.exports = new UploadRawDataController();
