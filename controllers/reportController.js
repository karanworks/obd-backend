const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class ReportController {
  async getReports(req, res) {
    try {
      const token = req.cookies.token;

      const { campaignId } = req.body;

      const loggedInUser = await prisma.user.findFirst({
        where: {
          token: parseInt(token),
        },
      });

      if (loggedInUser) {
        const campaign = await prisma.campaigns.findFirst({
          where: {
            id: parseInt(campaignId),
          },
        });

        // const reports = await prisma.$queryRawUnsafe(`
        //   SELECT
        //     \`connectedlinename\` As phoneNumber,
        //     (SELECT \`campaignName\` FROM \`Campaigns\` WHERE \`id\` = CampaignDialingData.campaignId) AS CampaignName,
        //     \`channelStateDesc\`,
        //     ('0') as StartTime,
        //     ('0') as EndTime,
        //     \`calldate\`,
        //     TIME_FORMAT(SEC_TO_TIME(\`duration\`), '%H:%i:%s') AS duration,
        //     TIME_FORMAT(SEC_TO_TIME(\`billsec\`), '%H:%i:%s') AS billsec,
        //     \`causeTxt\`,
        //     \`exten\`
        //   FROM
        //     \`CallResponseCDR\`
        //   LEFT JOIN
        //     (SELECT \`calldate\`, \`duration\`, \`billsec\`, \`uniqueid\` FROM \`Cdr\` WHERE 1) as rowCdr
        //     ON rowCdr.\`uniqueid\` = CallResponseCDR.uniqueid
        //   INNER JOIN
        //     \`CampaignDialingData\`
        //     ON CampaignDialingData.id = \`connectedlinenum\`
        //   WHERE
        //     \`connectedlinenum\` IN (SELECT \`id\` FROM \`CampaignDialingData\` WHERE \`campaignId\` = ${campaign.id})
        //   ORDER BY
        //     \`CallResponseCDR\`.\`exten\` ASC;
        // `);
        const reports = await prisma.$queryRawUnsafe(`
          SELECT 
            \`connectedlinename\` As phoneNumber,
            (SELECT \`campaignName\` FROM \`Campaigns\` WHERE \`id\` = CampaignDialingData.campaignId) AS CampaignName,
            \`channelStateDesc\`,
            ('0') as StartTime,
            ('0') as EndTime,
            TIME_FORMAT(SEC_TO_TIME(\`duration\`), '%H:%i:%s') AS duration,
            TIME_FORMAT(SEC_TO_TIME(\`billableSeconds\`), '%H:%i:%s') AS billsec,
            \`causeTxt\`,
            \`exten\`
          FROM 
            \`CallResponseCDR\` 
          LEFT JOIN 
            (SELECT \`startTime\`, \`duration\`, \`billableSeconds\`, \`uniqueid\` FROM \`Cdr\` WHERE 1) as rowCdr
            ON rowCdr.\`uniqueid\` = CallResponseCDR.uniqueid 
          INNER JOIN 
            \`CampaignDialingData\` 
            ON CampaignDialingData.id = \`connectedlinenum\` 
          WHERE 
            \`connectedlinenum\` IN (SELECT \`id\` FROM \`CampaignDialingData\` WHERE \`campaignId\` = ${campaign.id})
          ORDER BY 
            \`CallResponseCDR\`.\`exten\` ASC;
        `);

        response.success(res, "Report fetched!", { reports });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while fetchin report", error);
    }
  }
}

module.exports = new ReportController();
