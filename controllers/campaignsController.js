const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");
const AsteriskManager = require("asterisk-manager");

class CampaignsController {
  // Added constructor because I wanted to separate the writeFile function's code to separate function, and I wanted to use "this.writeFile" syntax that's why to bind the this keyword I had to use the constructor
  constructor() {
    this.campaignsGet = this.campaignsGet.bind(this);
    this.campaignCreatePost = this.campaignCreatePost.bind(this);
    this.campaignUpdatePatch = this.campaignUpdatePatch.bind(this);
    this.campaignsRemoveDelete = this.campaignsRemoveDelete.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.reloadDialplan = this.reloadDialplan.bind(this);
  }

  async campaignsGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const campaigns = await prisma.campaigns.findMany({
          where: {
            status: 1,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Campaigns fetched!", {
          ...adminDataWithoutPassword,
          campaigns,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting campaigns", error);
    }
  }

  async campaignCreatePost(req, res) {
    try {
      const {
        campaignName,
        welcomeMessageText,
        invalidMessageText,
        timeOutMessageText,
        gatewayId,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      if (loggedInUser) {
        const audioFiles = req.files;
        // const audioProperties = Object.keys(req.files);

        const baseUrl = "http://192.168.1.222/audio";

        const campaignAlreadyExist = await prisma.campaigns.findFirst({
          where: {
            campaignName,
          },
        });

        if (campaignAlreadyExist) {
          response.error(
            res,
            "Campaign Already Registered With This Name!",
            campaignAlreadyExist
          );
        }

        const newCampaign = await prisma.campaigns.create({
          data: {
            campaignName,
            welcomeMessageText,
            welcomeMessageAudio: audioFiles["welcomeMessageAudio"]
              ? `${baseUrl}/${audioFiles["welcomeMessageAudio"][0].filename}`
              : null,
            invalidMessageText,
            invalidMessageAudio: audioFiles["invalidMessageAudio"]
              ? `${baseUrl}/${audioFiles["invalidMessageAudio"][0].filename}`
              : null,
            timeOutMessageText,
            timeOutMessageAudio: audioFiles["timeOutMessageAudio"]
              ? `${baseUrl}/${audioFiles["timeOutMessageAudio"][0].filename}`
              : null,
            status: 1,
            gatewayId: gatewayId,
            dialplanName: campaignName.split(" ").join("_"),
            addedBy: loggedInUser.id,
          },
        });

        this.writeFile(newCampaign);
        this.reloadDialplan();

        const dialplanPath = path.resolve(
          __dirname,
          "../asterisk/dialplan",
          `${campaignName.split(" ").join("_")}.conf`
        );

        const extensionsConfigPath = path.resolve(
          "/etc/asterisk/extensions.conf"
        );

        fs.readFile(extensionsConfigPath, "utf8", (err, data) => {
          if (err) {
            return console.error("Error reading the file:", err);
          }

          // Write the modified content back to the file
          fs.appendFile(
            extensionsConfigPath,
            `\n#include ${dialplanPath}`,
            "utf8",
            (err) => {
              if (err) {
                return console.error("Error writing to the file:", err);
              }
              console.log("File updated successfully.");
            }
          );
        });

        response.success(res, "Campaign registered successfully!", newCampaign);
      }
    } catch (error) {
      console.log("error while campaign registration ->", error);
    }
  }

  async campaignUpdatePatch(req, res) {
    try {
      const {
        campaignName,
        welcomeMessageText,
        invalidMessageText,
        timeOutMessageText,
        gatewayId,
      } = req.body;

      const { campaignId } = req.params;

      const audioFiles = req.files;
      // const audioProperties = Object.keys(req.files);

      const baseUrl = "http://192.168.1.222/audio";

      // finding user from id
      const campaignFound = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (campaignFound) {
        const updatedCampaign = await prisma.campaigns.update({
          where: {
            id: campaignFound.id,
          },
          data: {
            campaignName,
            welcomeMessageText,
            welcomeMessageAudio: welcomeMessageText
              ? null
              : audioFiles["welcomeMessageAudio"]
              ? `${baseUrl}/${audioFiles["welcomeMessageAudio"][0].filename}`
              : campaignFound.welcomeMessageAudio || null,
            invalidMessageText,
            invalidMessageAudio: invalidMessageText
              ? null
              : audioFiles["invalidMessageAudio"]
              ? `${baseUrl}/${audioFiles["invalidMessageAudio"][0].filename}`
              : campaignFound.invalidMessageAudio || null,
            timeOutMessageText,
            timeOutMessageAudio: timeOutMessageText
              ? null
              : audioFiles["timeOutMessageAudio"]
              ? `${baseUrl}/${audioFiles["timeOutMessageAudio"][0].filename}`
              : campaignFound.timeOutMessageAudio || null,
            status: 1,
            gatewayId: gatewayId,
          },
        });

        console.log("UPDATED CAMPAIGN FOR RECHECK ->", updatedCampaign);

        const oldFilePath = path.resolve(
          __dirname,
          `../asterisk/dialplan/${campaignFound.campaignName
            .split(" ")
            .join("_")}.conf`
        );

        const dateTime = new Date();
        const formattedDateTime = `${String(dateTime.getDate()).padStart(
          2,
          "0"
        )}${String(dateTime.getMonth() + 1).padStart(2, "0")}${String(
          dateTime.getFullYear()
        ).slice(-2)}${String(dateTime.getHours()).padStart(2, "0")}${String(
          dateTime.getMinutes()
        ).padStart(2, "0")}${String(dateTime.getSeconds()).padStart(2, "0")}`;

        const newFilePath = path.resolve(
          __dirname,
          `../asterisk/dialplan/${campaignName
            .split(" ")
            .join("_")}_${formattedDateTime}.conf`
        );

        fs.rename(oldFilePath, newFilePath, (err) => {
          if (err) {
            console.log("Error while renaming dialplan file name ->", err);
          }
        });

        this.writeFile(updatedCampaign);
        this.reloadDialplan();

        response.success(res, "Campaign updated successfully!", {
          updatedCampaign,
        });
      } else {
        response.error(res, "campaign not found!");
      }
    } catch (error) {
      console.log("error while updating campaign controller", error);
    }
  }

  async campaignsRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { campaignId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const campaignToBeDeleted = await prisma.campaigns.findFirst({
          where: {
            id: parseInt(campaignId),
          },
        });

        const removedCampaign = await prisma.campaigns.update({
          where: {
            id: campaignToBeDeleted.id,
          },
          data: {
            status: 0,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Campaigns fetched!", {
          ...adminDataWithoutPassword,
          removedCampaign,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing campaign", error);
    }
  }

  writeFile(newCampaign) {
    const dirPath = path.join(__dirname, "..", "asterisk/dialplan");

    const fileName = newCampaign.campaignName.split(" ").join("_") + ".conf";

    const filePath = path.join(dirPath, fileName);

    let welcomeMsg = {
      message: "",
      type: "",
    };

    let invalidMsg = {
      message: "",
      type: "",
    };

    let timeOutMsg = {
      message: "",
      type: "",
    };

    if (newCampaign.welcomeMessageText) {
      welcomeMsg["message"] = newCampaign.welcomeMessageText;
      welcomeMsg["type"] = "Text";
    } else if (newCampaign.welcomeMessageAudio) {
      const urlParts = newCampaign.welcomeMessageAudio.split("/");

      welcomeMsg["message"] = urlParts[urlParts.length - 1];
      welcomeMsg["type"] = "Audio";
    }

    if (newCampaign.invalidMessageText) {
      invalidMsg["message"] = newCampaign.invalidMessageText;
      invalidMsg["type"] = "Text";
    } else if (newCampaign.invalidMessageAudio) {
      const urlParts = newCampaign.invalidMessageAudio.split("/");

      invalidMsg["message"] = urlParts[urlParts.length - 1];
      invalidMsg["type"] = "Audio";
    }

    if (newCampaign.timeOutMessageText) {
      timeOutMsg["message"] = newCampaign.timeOutMessageText;
      timeOutMsg["type"] = "Text";
    } else if (newCampaign.timeOutMessageAudio) {
      const urlParts = newCampaign.timeOutMessageAudio.split("/");

      timeOutMsg["message"] = urlParts[urlParts.length - 1];
      timeOutMsg["type"] = "Audio";
    }

    const lines = [
      `[${newCampaign.campaignName.split(" ").join("_")}]`,
      "exten => _X.,1,Answer()",
      "",
      `${
        welcomeMsg.type === "Text"
          ? `same => n,agi(googletts.agi,"${welcomeMsg.message}",en)`
          : // : `same => n,Background(asterisk/audio/${welcomeMsg.message})`
            `same => n,Background(${path.join(
              __dirname,
              "..",
              `asterisk/audio/${welcomeMsg.message.split(".")[0]}`
            )})`
      }`,
      "same => n,WaitExten(2)",
      "",
      'exten => i,1,noOp("Invalid Option choosen")',
      `${
        invalidMsg.type === "Text"
          ? `same => n,agi(googletts.agi,"${invalidMsg.message}",en)`
          : // : `same => n,Background(asterisk/audio/${invalidMsg.message})`
            `same => n,Background(${path.join(
              __dirname,
              "..",
              `asterisk/audio/${invalidMsg.message.split(".")[0]}`
            )})`
      }`,
      "same => n,Hangup()",
      "",
      'exten => t,1,NoOp("TimeOut")',
      `${
        timeOutMsg.type === "Text"
          ? `same => n,agi(googletts.agi,"${timeOutMsg.message}",en)`
          : // : `same => n,Background(asterisk/audio/${timeOutMsg.message})`
            `same => n,Background(${path.join(
              __dirname,
              "..",
              `asterisk/audio/${timeOutMsg.message.split(".")[0]}`
            )})`
      }`,
      "same => n,Hangup()",
    ];

    lines.forEach((line, index) => {
      fs.appendFileSync(filePath, line + "\n", "utf8", (err) => {
        if (err) {
          console.error("Error creating or writing to file:", err);
        } else {
          console.log("File created and written successfully.");
        }
      });
    });
  }

  reloadDialplan() {
    const ami = new AsteriskManager(
      5038,
      "localhost",
      "asteriskAdmin",
      "asteriskAdmin#13",
      true
    );

    // Listen for connection events
    ami.on("connect", () => {
      console.log("Connected to Asterisk Manager Interface");

      // Execute 'core reload' command
      ami.action(
        {
          action: "Command",
          command: "dialplan reload",
        },
        (err, res) => {
          if (err) {
            console.error("Error executing command:", err);
          } else {
            console.log("Command result:", res);
          }
        }
      );

      // Listen for disconnection events
      ami.on("disconnect", () => {
        console.log("Disconnected from Asterisk Manager Interface");
      });

      // Handle any errors
      ami.on("error", (err) => {
        console.error("Connection error:", err);
      });

      // Log off and close the connection when done
      ami.on("response", (response) => {
        if (response && response.Response === "Goodbye") {
          ami.disconnect();
        }
      });

      // Keep the connection alive
      process.on("SIGINT", () => {
        ami.disconnect();
      });
    });
  }
}

module.exports = new CampaignsController();
