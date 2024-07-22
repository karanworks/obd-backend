const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");

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

        // Convert xlsx buffer to workbook
        const workbook = xlsx.read(buffer, { type: "buffer" });

        // Convert first sheet to CSV
        const sheetName = workbook.SheetNames[0];
        const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);

        const rows = csvData.trim().split("\n");

        const columns = rows[0].split(",").map((column) => column.trim());
        const dataObj = {};
        columns.forEach((column) => (dataObj[column] = []));

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i]?.split(",").map((value) => value.trim());
          // const mobileNos = values[values.length - 1];

          for (let j = 0; j < values.length; j++) {
            dataObj[columns[j]].push(values[j]);
          }
        }

        const numberOfRecords = dataObj[columns[0]].length;

        for (let k = 0; k < numberOfRecords; k++) {
          const mobilesNos = this.getNumbers(dataObj["tel_Other"][k]);

          // Skip record creation if mobile1 is null
          if (!mobilesNos[0]) {
            // console.log("Skipping record due to missing mobile number.");
            continue;
          }

          const mobileConditions = [];

          // Add conditions to the array only if the value is not null
          if (mobilesNos[0]) {
            mobileConditions.push({ mobile1: mobilesNos[0] });
          }
          if (mobilesNos[1]) {
            mobileConditions.push({ mobile2: mobilesNos[1] });
          }
          if (mobilesNos[2]) {
            mobileConditions.push({ mobile3: mobilesNos[2] });
          }

          const recordAlreadyExist = await prisma.rawFormData.findFirst({
            where: {
              OR: mobileConditions,
            },
          });

          if (recordAlreadyExist) {
            // console.log("Skipping record due to existing record.");
            continue;
          }

          const record = {
            name: dataObj["candidateName"][k],
            email: dataObj["emailAddress"][k],
            state: dataObj["locationCurrentMas"][k],
            salary: dataObj["salary"][k],
            company: dataObj["companyName"][k],
            departmentPosition: dataObj["designation"][k],
            dataType: dataType,
            mobile1: mobilesNos[0],
            mobile2: mobilesNos[1] ? mobilesNos[1] : null,
            mobile3: mobilesNos[2] ? mobilesNos[2] : null,
            vendor: vendorName,
            purchaseDate: purchaseDate[0],
            addedBy: loggedInUser.id,
          };

          // create record for each line in excel file
          await prisma.rawFormData.create({
            data: record,
          });
        }

        response.success(res, "Data uploaded successfully!", rows);
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  };

  // uploadRawDataPost = async (req, res) => {
  //   try {
  //     const { vendorName, dataType, purchaseDate } = req.body;
  //     const loggedInUser = await getLoggedInUser(req, res);

  //     if (loggedInUser) {
  //       if (!req.file) {
  //         return res.status(400).send("No file uploaded.");
  //       }

  //       const { buffer } = req.file;

  //       // Convert xlsx buffer to workbook
  //       const workbook = xlsx.read(buffer, { type: "buffer" });

  //       // Convert first sheet to CSV
  //       const sheetName = workbook.SheetNames[0];
  //       const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);

  //       const rows = csvData.trim().split("\n");

  //       // Extract column headers
  //       const columns = rows[0].split(",").map((column) => column.trim());

  //       // Initialize an array to store row data objects
  //       const dataObj = [];

  //       // Iterate over the data rows starting from index 1 (skipping header row)
  //       for (let i = 1; i < rows.length; i++) {
  //         const values = rows[i].split(",").map((value) => value.trim());

  //         // Create a row object using column headers as keys
  //         const rowObject = {};
  //         columns.forEach((column, index) => {
  //           rowObject[column] = values[index];
  //         });

  //         // Push the row object into dataObj
  //         dataObj.push(rowObject);
  //       }

  //       const numberOfRecords = dataObj.length;

  //       const records = await prisma.rawFormDataTwo.createMany({
  //         data: dataObj,
  //       });

  //       // for (let k = 0; k < numberOfRecords; k++) {
  //       //   const mobilesNos = this.getNumbers(dataObj[k]["tel_Other"]);

  //       //   // Skip record creation if mobile1 is null
  //       //   if (!mobilesNos[0]) {
  //       //     // console.log("Skipping record due to missing mobile number.");
  //       //     continue;
  //       //   }

  //       //   const mobileConditions = [];

  //       //   // Add conditions to the array only if the value is not null
  //       //   if (mobilesNos[0]) {
  //       //     mobileConditions.push({ mobile1: mobilesNos[0] });
  //       //   }
  //       //   if (mobilesNos[1]) {
  //       //     mobileConditions.push({ mobile2: mobilesNos[1] });
  //       //   }
  //       //   if (mobilesNos[2]) {
  //       //     mobileConditions.push({ mobile3: mobilesNos[2] });
  //       //   }

  //       //   const recordAlreadyExist = await prisma.rawFormData.findFirst({
  //       //     where: {
  //       //       OR: mobileConditions,
  //       //     },
  //       //   });

  //       //   if (recordAlreadyExist) {
  //       //     // console.log("Skipping record due to existing record.");
  //       //     continue;
  //       //   }

  //       //   const record = {
  //       //     name: dataObj[k]["candidateName"],
  //       //     email: dataObj[k]["emailAddress"],
  //       //     state: dataObj[k]["locationCurrentMas"],
  //       //     salary: dataObj[k]["salary"],
  //       //     company: dataObj[k]["companyName"],
  //       //     departmentPosition: dataObj[k]["designation"],
  //       //     dataType: dataType,
  //       //     mobile1: mobilesNos[0],
  //       //     mobile2: mobilesNos[1] ? mobilesNos[1] : null,
  //       //     mobile3: mobilesNos[2] ? mobilesNos[2] : null,
  //       //     vendor: vendorName,
  //       //     purchaseDate: purchaseDate[0],
  //       //     addedBy: loggedInUser.id,
  //       //   };

  //       //   console.time("RECORD CREATION TIME");

  //       //   // Create record for each line in excel file
  //       //   // await prisma.rawFormData.create({
  //       //   //   data: record,
  //       //   // });
  //       //   console.timeEnd("RECORD CREATION TIME");
  //       // }

  //       response.success(res, "Data uploaded successfully!", rows);
  //     }
  //   } catch (error) {
  //     console.log("error while form status submission ->", error);
  //   }
  // };

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
}

// getNumbers(numberString) {
//   const separatedMobileNos = numberString.split(";");

//   const firstMobileNoRegex = /\d{10}/g;
//   const firstMobileNo = separatedMobileNos[0].match(firstMobileNoRegex);

//   const secondMobileNoRegex = /[^0-9]+/;
//   const secondMobileNoExtraction =
//     Boolean(separatedMobileNos[1]) &&
//     separatedMobileNos[1]?.split(secondMobileNoRegex)?.filter(Boolean);

//   const lastSectionDigits =
//     secondMobileNoExtraction[secondMobileNoExtraction?.length - 1];

//   const lastSectionDigitsLength = lastSectionDigits?.length;

//   const thirdMobileNoRegex = /[^0-9]+/;
//   const thirdMobileNoExtraction =
//     Boolean(separatedMobileNos[2]) &&
//     separatedMobileNos[2]?.split(thirdMobileNoRegex)?.filter(Boolean);

//   const thirdNumberLastSectionDigits =
//     thirdMobileNoExtraction[thirdMobileNoExtraction?.length - 1];

//   const thirdNumberLastSectionDigitsLength =
//     thirdNumberLastSectionDigits?.length;

//   let mobileNos = [];

//   // for first mobile no
//   if (firstMobileNo?.length > 0) {
//     mobileNos.push(firstMobileNo[0]);
//   } else {
//     mobileNos.push(null);
//   }

//   // this ensures that if second no exists (there are some cases where only 1 no is present)
//   // for second mobile no
//   if (secondMobileNoExtraction?.length > 0) {
//     if (lastSectionDigitsLength === 10) {
//       mobileNos.push(lastSectionDigits);
//     } else if (lastSectionDigitsLength < 7) {
//       // this make sures random doesn't pass this (there are numbers which only has "91", "91-91" etc)
//       mobileNos.push(null);
//     } else {
//       mobileNos.push(separatedMobileNos[1]);
//     }
//   } else {
//     mobileNos.push(null);
//   }

//   // for third mobile no
//   if (thirdMobileNoExtraction?.length > 0) {
//     if (thirdNumberLastSectionDigitsLength === 10) {
//       mobileNos.push(thirdNumberLastSectionDigits);
//     } else if (thirdNumberLastSectionDigitsLength < 7) {
//       // this make sures random doesn't pass this (there are numbers which only has "91", "91-91" etc)
//       mobileNos.push(null);
//     } else {
//       mobileNos.push(separatedMobileNos[2]);
//     }
//   } else {
//     mobileNos.push(null);
//   }

//   return mobileNos;
// }
module.exports = new UploadRawDataController();
