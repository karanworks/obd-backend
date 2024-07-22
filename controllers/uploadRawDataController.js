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
          const mobilesNos = this.extractNumbers(dataObj["tel_Other"][k]);

          // Skip record creation if mobile1 is null
          if (!mobilesNos[0]) {
            console.log("Skipping record due to missing mobile number.");
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

  extractNumbers(numberString) {
    const separatedMobileNos = numberString.split(";");

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

    if (firstMobileNo?.length > 0) {
      mobileNos.push(firstMobileNo[0]);
    } else {
      mobileNos.push(null);
    }

    // this ensures that if second no exists (there are some cases where only 1 no is present)
    if (secondMobileNoExtraction?.length > 0) {
      if (lastSectionDigitsLength === 10) {
        mobileNos.push(lastSectionDigits);
      } else {
        mobileNos.push(separatedMobileNos[1]);
      }
    } else {
      mobileNos.push(null);
    }

    if (thirdMobileNoExtraction?.length > 0) {
      if (thirdNumberLastSectionDigitsLength === 10) {
        mobileNos.push(thirdNumberLastSectionDigits);
      } else {
        mobileNos.push(separatedMobileNos[2]);
      }
    } else {
      mobileNos.push(null);
    }

    return mobileNos;
  }
}

module.exports = new UploadRawDataController();
