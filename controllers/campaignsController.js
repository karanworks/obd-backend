const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");

class CampaignsController {
  // Added constructor because I wanted to separate the writeFile function's code to separate function, and I wanted to use "this.writeFile" syntax that's why to bind the this keyword I had to use the constructor
  constructor() {
    this.campaignsGet = this.campaignsGet.bind(this);
    this.campaignCreatePost = this.campaignCreatePost.bind(this);
    this.campaignUpdatePatch = this.campaignUpdatePatch.bind(this);
    this.campaignsRemoveDelete = this.campaignsRemoveDelete.bind(this);
    this.writeFile = this.writeFile.bind(this);
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

        const baseUrl = "http://192.168.1.200/audio";

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
            addedBy: loggedInUser.id,
          },
        });

        this.writeFile(newCampaign);

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
        channels,
        welcomeMessageText,
        invalidMessageText,
        timeOutMessageText,
        status,
        gatewayId,
      } = req.body;

      const { campaignId } = req.params;

      const audioFiles = req.files;
      // const audioProperties = Object.keys(req.files);

      const baseUrl = "http://192.168.1.200/audio";

      // finding user from id
      const campaignFound = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (campaignFound) {
        if (status === 0 || status === 1) {
          const updatedCampaign = await prisma.campaigns.update({
            where: {
              id: parseInt(teamId),
            },

            data: {
              status,
            },
          });

          response.success(res, "Campaigns removed successfully!", {
            updatedCampaign,
          });
        } else {
          console.log("CAMPAIGN FOUND FOR UPDATING VALUE ->", campaignFound);
          console.log(
            "AUDIO FOUND FOR UPDATING VALUE ->",
            audioFiles["welcomeMessageAudio"]
          );

          console.log("CONDITION FOR REPLACING TEXT 0 ->", welcomeMessageText);

          console.log(
            "CONDITION FOR REPLACING TEXT 1 ->",
            welcomeMessageText
              ? null
              : audioFiles["welcomeMessageAudio"]
              ? `${baseUrl}/${audioFiles["welcomeMessageAudio"][0].filename}`
              : campaignFound.welcomeMessageAudio || null
          );
          console.log(
            "CONDITION FOR REPLACING TEXT 2->",
            audioFiles["welcomeMessageAudio"]
              ? `${baseUrl}/${audioFiles["welcomeMessageAudio"][0].filename}`
              : campaignFound.welcomeMessageAudio || null
          );

          const updatedCampaign = await prisma.campaigns.update({
            where: {
              id: parseInt(campaignId),
            },

            data: {
              campaignName,
              channels,
              welcomeMessageText: audioFiles["welcomeMessageAudio"]
                ? ""
                : welcomeMessageText,
              welcomeMessageAudio: welcomeMessageText
                ? null
                : audioFiles["welcomeMessageAudio"]
                ? `${baseUrl}/${audioFiles["welcomeMessageAudio"][0].filename}`
                : campaignFound.welcomeMessageAudio || null,
              invalidMessageText: audioFiles["invalidMessageAudio"]
                ? ""
                : invalidMessageText,
              invalidMessageAudio: invalidMessageText
                ? null
                : audioFiles["invalidMessageAudio"]
                ? `${baseUrl}/${audioFiles["invalidMessageAudio"][0].filename}`
                : campaignFound.invalidMessageAudio || null,
              timeOutMessageText: audioFiles["timeOutMessageAudio"]
                ? ""
                : timeOutMessageText,
              timeOutMessageAudio: timeOutMessageText
                ? null
                : audioFiles["timeOutMessageAudio"]
                ? `${baseUrl}/${audioFiles["timeOutMessageAudio"][0].filename}`
                : campaignFound.timeOutMessageAudio || null,
              gatewayId: gatewayId,
            },
          });

          if (updatedCampaign) {
            const filePath = path.resolve(
              __dirname,
              `../asterisk/dialplan/${campaignFound.campaignName
                .split(" ")
                .join("_")}.conf`
            );

            fs.readFile(filePath, "utf-8", (err, data) => {
              let lines = data.split("\n");

              console.log("CAMPAIGN FOUND ->", campaignFound);

              if (campaignFound.welcomeMessageText) {
                console.log(
                  "UPDATED CAMPAIGN WELCOME MESSAGE ->",
                  updatedCampaign
                );

                if (updatedCampaign.welcomeMessageText) {
                  lines = lines.map((line) =>
                    line.includes(campaignFound.welcomeMessageText)
                      ? line.replace(
                          campaignFound.welcomeMessageText,
                          updatedCampaign.welcomeMessageText
                        ) // Replace with the new welcome message
                      : line
                  );
                }

                if (
                  updatedCampaign.welcomeMessageAudio &&
                  audioFiles["welcomeMessageAudio"]
                ) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,agi(googletts.agi,"${campaignFound.welcomeMessageText}",en)`
                    ) {
                      return `same => n,Background(asterisk/audio/${audioFiles["welcomeMessageAudio"][0].filename})`;
                    } else {
                      return line;
                    }
                  });
                }
              }
              if (campaignFound.welcomeMessageAudio) {
                console.log(
                  "UPDATED CAMPAIGN WELCOME AUDIO ->",
                  updatedCampaign
                );

                if (updatedCampaign.welcomeMessageText) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,Background(asterisk/audio/${campaignFound.welcomeMessageAudio
                        .split("/")
                        .at(-1)})`
                    ) {
                      return `same => n,agi(googletts.agi,"${welcomeMessageText}",en)`;
                    } else {
                      return line;
                    }
                  });
                }

                if (
                  updatedCampaign.welcomeMessageAudio &&
                  audioFiles["welcomeMessageAudio"]
                ) {
                  lines = lines.map((line) =>
                    line.includes(
                      campaignFound.welcomeMessageAudio.split("/").at(-1)
                    )
                      ? line.replace(
                          campaignFound.welcomeMessageAudio.split("/").at(-1),
                          audioFiles["welcomeMessageAudio"][0].filename
                        ) // Replace with the new welcome message
                      : line
                  );
                }
              }

              if (campaignFound.invalidMessageText) {
                console.log(
                  "UPDATED CAMPAIGN INVALID MESSAGE ->",
                  updatedCampaign
                );
                if (updatedCampaign.invalidMessageText) {
                  lines = lines.map((line) =>
                    line.includes(campaignFound.invalidMessageText)
                      ? line.replace(
                          campaignFound.invalidMessageText,
                          updatedCampaign.invalidMessageText
                        ) // Replace with the new welcome message
                      : line
                  );
                }

                if (
                  updatedCampaign.invalidMessageAudio &&
                  audioFiles["invalidMessageAudio"]
                ) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,agi(googletts.agi,"${campaignFound.invalidMessageText}",en)`
                    ) {
                      return `same => n,Background(asterisk/audio/${audioFiles["invalidMessageAudio"][0].filename})`;
                    } else {
                      return line;
                    }
                  });
                }
              }
              if (campaignFound.invalidMessageAudio) {
                console.log(
                  "UPDATED CAMPAIGN INVALID AUDIO ->",
                  updatedCampaign
                );
                if (updatedCampaign.invalidMessageText) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,Background(asterisk/audio/${campaignFound.invalidMessageAudio
                        .split("/")
                        .at(-1)})`
                    ) {
                      return `same => n,agi(googletts.agi,"${invalidMessageText}",en)`;
                    } else {
                      return line;
                    }
                  });
                }

                if (
                  updatedCampaign.invalidMessageAudio &&
                  audioFiles["invalidMessageAudio"]
                ) {
                  lines = lines.map((line) =>
                    line.includes(
                      campaignFound.invalidMessageAudio.split("/").at(-1)
                    )
                      ? line.replace(
                          campaignFound.invalidMessageAudio.split("/").at(-1),
                          audioFiles["invalidMessageAudio"][0].filename
                        ) // Replace with the new welcome message
                      : line
                  );
                }
              }

              if (campaignFound.timeOutMessageText) {
                console.log(
                  "UPDATED CAMPAIGN TIMEOUT MESSAGE ->",
                  updatedCampaign
                );
                if (updatedCampaign.timeOutMessageText) {
                  lines = lines.map((line) =>
                    line.includes(campaignFound.timeOutMessageText)
                      ? line.replace(
                          campaignFound.timeOutMessageText,
                          updatedCampaign.timeOutMessageText
                        ) // Replace with the new welcome message
                      : line
                  );
                }

                if (
                  updatedCampaign.timeOutMessageAudio &&
                  audioFiles["timeOutMessageAudio"]
                ) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,agi(googletts.agi,"${campaignFound.timeOutMessageText}",en)`
                    ) {
                      return `same => n,Background(asterisk/audio/${audioFiles["timeOutMessageAudio"][0].filename})`;
                    } else {
                      return line;
                    }
                  });
                }
              }
              if (campaignFound.timeOutMessageAudio) {
                console.log(
                  "UPDATED CAMPAIGN TIMEOUT MESSAGE AUDIO ->",
                  updatedCampaign
                );
                if (updatedCampaign.timeOutMessageText) {
                  lines = lines.map((line) => {
                    if (
                      line ===
                      `same => n,Background(asterisk/audio/${campaignFound.timeOutMessageAudio
                        .split("/")
                        .at(-1)})`
                    ) {
                      return `same => n,agi(googletts.agi,"${timeOutMessageText}",en)`;
                    } else {
                      return line;
                    }
                  });
                }

                if (
                  updatedCampaign.timeOutMessageAudio &&
                  audioFiles["timeOutMessageAudio"]
                ) {
                  lines = lines.map((line) =>
                    line.includes(
                      campaignFound.timeOutMessageAudio.split("/").at(-1)
                    )
                      ? line.replace(
                          campaignFound.timeOutMessageAudio.split("/").at(-1),
                          audioFiles["timeOutMessageAudio"][0].filename
                        ) // Replace with the new welcome message
                      : line
                  );
                }
              }

              const modifiedContent = lines.join("\n");

              fs.writeFile(filePath, modifiedContent, "utf8", (err) => {
                if (err) {
                  console.error("Error writing to the file:", err);
                  return;
                }

                console.log("File updated successfully.");
              });
            });
          }

          response.success(res, "Campaign updated successfully!", {
            updatedCampaign,
          });
        }
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
  7;
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
          : `same => n,Background(asterisk/audio/${welcomeMsg.message})`
      }`,
      "same => n,WaitExten(2)",
      "",
      'exten => i,1,noOp("Invalid Option choosen")',
      `${
        invalidMsg.type === "Text"
          ? `same => n,agi(googletts.agi,"${invalidMsg.message}",en)`
          : `same => n,Background(asterisk/audio/${invalidMsg.message})`
      }`,
      "same => n,Hangup()",
      "",
      'exten => t,1,NoOp("TimeOut")',
      `${
        timeOutMsg.type === "Text"
          ? `same => n,agi(googletts.agi,"${timeOutMsg.message}",en)`
          : `same => n,Background(asterisk/audio/${timeOutMsg.message})`
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
}

module.exports = new CampaignsController();
