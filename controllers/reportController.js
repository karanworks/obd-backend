const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");
const { makeCall } = require("../testFile");

class TestIVRController {
  async testIvr(req, res) {
    try {
      const token = req.cookies.token;

      const { phoneNumber } = req.body;

      const { campaignId } = req.params;

      const campaign = await prisma.campaigns.findFirst({
        where: { id: parseInt(campaignId) },
      });

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        // MAKE CALL (CALL MILEGI KAISE IS SERVER PAR ASTERISK THODI CHAL RHA HAI)
        makeCall(phoneNumber, `${phoneNumber}<test>`, campaign.dialplanName);

        response.success(res, "Tested IVR successfully!");
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while testing ivr", error);
    }
  }
}

module.exports = new TestIVRController();
