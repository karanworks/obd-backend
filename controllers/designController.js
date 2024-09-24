const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");
const AsteriskManager = require("asterisk-manager");

class DesignController {
  constructor() {
    this.designsGet = this.designsGet.bind(this);
    this.designCreatePost = this.designCreatePost.bind(this);
    this.designUpdatePatch = this.designUpdatePatch.bind(this);
    this.designRemoveDelete = this.designRemoveDelete.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.reloadDialplan = this.reloadDialplan.bind(this);
  }

  async designsGet(req, res) {
    try {
      const token = req.cookies.token;

      const { campaignId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const designs = await prisma.design.findMany({
          where: {
            campaignId: parseInt(campaignId),
            status: 1,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Designs fetched!", {
          ...adminDataWithoutPassword,
          designs,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting design", error);
    }
  }

  async designCreatePost(req, res) {
    try {
      const { key, messageText, mobileNumber, campaignId } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      const baseUrl = "http://192.168.1.222/audio";
      // const baseUrl = "http://localhost:3008/audio";

      const designAlreadyExistOnKey = await prisma.design.findFirst({
        where: {
          key,
          status: 1,
          campaignId: parseInt(campaignId),
        },
      });

      if (designAlreadyExistOnKey) {
        response.error(
          res,
          "Design already exist for this key!",
          designAlreadyExistOnKey
        );
      }

      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: parseInt(campaignId),
        },
      });

      if (loggedInUser) {
        let newDesign;

        if (messageText) {
          newDesign = await prisma.design.create({
            data: {
              key,
              messageText,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });

          this.writeFile(key, "Text", messageText, campaign.campaignName);
        } else if (mobileNumber) {
          newDesign = await prisma.design.create({
            data: {
              key,
              mobileNumber,
              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });
          this.writeFile(
            key,
            "Mobile Number",
            mobileNumber,
            campaign.campaignName
          );
        } else if (req.file) {
          newDesign = await prisma.design.create({
            data: {
              key,
              messageAudio: `${baseUrl}/${req.file.filename}`,

              campaignId: parseInt(campaignId),
              addedBy: loggedInUser.id,
            },
          });

          this.writeFile(
            key,
            "Audio",
            req.file.filename,
            campaign.campaignName
          );
        }

        this.reloadDialplan();
        response.success(res, "Design created successfully!", newDesign);
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async designUpdatePatch(req, res) {
    try {
      const { messageText, mobileNumber } = req.body;

      const { designId } = req.params;

      const baseUrl = "http://192.168.1.222/audio";
      // const baseUrl = "http://localhost:3008/audio";

      const designFound = await prisma.design.findFirst({
        where: {
          id: parseInt(designId),
        },
      });

      const campaign = await prisma.campaigns.findFirst({
        where: {
          id: designFound.campaignId,
        },
      });

      if (designFound) {
        const updatedDesign = await prisma.design.update({
          where: {
            id: designFound.id,
          },

          data: {
            messageText: messageText ? messageText : null,
            mobileNumber: mobileNumber ? mobileNumber : null,
            messageAudio: req.file ? `${baseUrl}/${req.file.filename}` : null,
          },
        });

        if (updatedDesign) {
          const dirPath = path.join(__dirname, "..", "asterisk/dialplan");

          const fileName = campaign.campaignName.split(" ").join("_");

          const filePath = path.join(dirPath, fileName + ".conf");

          const dateTime = new Date();
          const formattedDateTime = `${String(dateTime.getDate()).padStart(
            2,
            "0"
          )}${String(dateTime.getMonth() + 1).padStart(2, "0")}${String(
            dateTime.getFullYear()
          ).slice(-2)}${String(dateTime.getHours()).padStart(2, "0")}${String(
            dateTime.getMinutes()
          ).padStart(2, "0")}${String(dateTime.getSeconds()).padStart(2, "0")}`;

          fs.readFile(filePath, "utf-8", (err, data) => {
            if (err) {
              return console.log(
                "Error while reading dialplan file while updating design"
              );
            }

            const lines = data.split("\n");

            // RENAMING THE OLD DIALPLAN FILE
            fs.rename(
              filePath,
              dirPath + `/${fileName}_${formattedDateTime}.conf`,
              (err) => {
                if (err) {
                  console.log(
                    "Error renaming dilaplan file while updating design inside design controller",
                    err
                  );
                }
              }
            );

            const linesCopy = [...lines];

            linesCopy.forEach((line, index) => {
              if (
                line === `exten => 1,1,noOp("Presses ${updatedDesign.key}")`
              ) {
                if (updatedDesign.messageText) {
                  linesCopy[
                    index + 1
                  ] = `same => n,agi(googletts.agi,"${updatedDesign.messageText}",en)`;
                } else if (updatedDesign.mobileNumber) {
                  linesCopy[index + 1] =
                    'same => n,agi(googletts.agi,"Please wait , while we are connecting your call to Agent",en)';
                  linesCopy[
                    index + 2
                  ] = `same => n,Gosub(dial-gsm,s,1,(${updatedDesign.mobileNumber}))`;
                } else if (updatedDesign.messageAudio) {
                  linesCopy[
                    index + 1
                  ] = `same => n,Background(asterisk/audio/${updatedDesign.messageAudio})`;
                }
              }
            });

            // CREATING NEW DIALPLAN FILE WITH MODIFIED DATA
            fs.writeFile(filePath, linesCopy.join("\n"), "utf8", (err) => {
              if (err) {
                console.error("Error writing to the file:", err);
                return;
              }

              console.log("File updated successfully.");
            });
          });
        }

        this.reloadDialplan();
        response.success(res, "Design updated successfully!", {
          updatedDesign,
        });
      } else {
        response.error(res, "design not found!");
      }
    } catch (error) {
      console.log("error while updating design controller", error);
    }
  }

  async designRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { designId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const removedDesign = await prisma.design.update({
          where: {
            id: parseInt(designId),
          },
          data: {
            status: 0,
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Campaigns fetched!", {
          ...adminDataWithoutPassword,
          removedDesign,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing design", error);
    }
  }

  writeFile(key, designType, designMessage, campaignName) {
    const lines = [
      "",
      `exten => 1,1,noOp("Presses ${key}")`,
      `${
        designType === "Text"
          ? `same => n,agi(googletts.agi,"${designMessage}",en)\nsame => n,Hangup()`
          : designType === "Audio"
          ? `same => n,Background(asterisk/audio/${designMessage})\nsame => n,Hangup()`
          : designType === "Mobile Number"
          ? `same => n,agi(googletts.agi,"Please wait , while we are connecting your call to Agent",en)\nsame => n,Gosub(dial-gsm,s,1,(${designMessage}))`
          : ""
      }`,
    ];

    lines.forEach((line) => {
      fs.appendFileSync(
        `asterisk/dialplan/${campaignName.split(" ").join("_")}.conf`,
        line + "\n",
        "utf8",
        (err) => {
          if (err) {
            console.error("Error creating or writing to file:", err);
          } else {
            console.log("File created and written successfully.");
          }
        }
      );
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

module.exports = new DesignController();
