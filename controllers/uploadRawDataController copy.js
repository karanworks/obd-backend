const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const xlsx = require("xlsx");

class UploadRawDataController {
  async uploadRawDataPost(req, res) {
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
          const mobileNos = values[values.length - 1];

          const separatedMobileNos = mobileNos.split(";");

          const firstMobileNoRegex = /\d{10}/g; // regex for getting 10 consecutive numbers from a string
          const firstMobileNo = separatedMobileNos[0].match(firstMobileNoRegex);

          // console.log("SEPARATION ->", separatedMobileNos[1]);

          const secondMobileNoRegex = /[^0-9]+/; // split numbers where there are no numbers (numbers will be separated based on space and symbols for example - "+91--9096273020" will become [91, 9096273020] )

          const secondMobileNoExtraction =
            Boolean(separatedMobileNos[1]) &&
            separatedMobileNos[1]?.split(secondMobileNoRegex)?.filter(Boolean);

          const lastSectionDigits =
            secondMobileNoExtraction[secondMobileNoExtraction?.length - 1];
          const lastSectionDigitsLength = lastSectionDigits?.length;

          const secondLastSectionDigits =
            secondMobileNoExtraction[secondMobileNoExtraction?.length - 2];

          // combining last two sections eg. ["91", "88844", "99999"] = "8884499999"
          // const lastSectionDigitAfterCombiningTwoSections =
          //   secondMobileNoExtraction?.length > 2
          //     ? secondMobileNoExtraction[secondMobileNoExtraction?.length - 2] +
          //       lastSectionDigits
          //     : "" + lastSectionDigits; // checks whether section has more than 1 item, Example - +91-9820130125; +91-; -91; 22; 25531923, will be in separate section hence there will not be any other element this will be separated like [["91", "9820130125" ], ["91"](here we don't have second value so it won't be able to get the length - 2 element) , ["91"], ["22"], ["25531923"] ]

          // const lastSectionDigitAfterCombiningTwoSectionsLength =
          //   lastSectionDigitAfterCombiningTwoSections.length;

          let secondMobileNo;

          if (firstMobileNo?.length > 0) {
            console.log("FIRST MOBILE NO ->", firstMobileNo);
          } else {
            console.log("MOBILE NOT IN CORRECT FORMAT ->", firstMobileNo);
          }

          // this ensures that if second no exists (there are some cases where only 1 no is present)
          if (secondMobileNoExtraction?.length > 0) {
            // this checkes whether the last section itself has 10 numbers which means it itself is mobile No
            if (lastSectionDigitsLength === 10) {
              console.log("MOBILE NO ->", lastSectionDigits);
            } else if (
              // Landline no are not less than 7 and it can go upto 12 digits
              lastSectionDigitsLength !== 10 &&
              lastSectionDigitsLength >= 7 &&
              lastSectionDigitsLength <= 12
            ) {
              // makes 10 digit mobile number by adding second last and last item in the array
              console.log("LANDLINE ->", lastSectionDigits);
            } else {
              console.log(
                "COMBINED NUMBERS ->",
                secondLastSectionDigits + "-" + lastSectionDigits
              );
            }
          }
        }

        response.success(res, "Data uploaded successfully!", rows);
      }
    } catch (error) {
      console.log("error while form status submission ->", error);
    }
  }
}

module.exports = new UploadRawDataController();
