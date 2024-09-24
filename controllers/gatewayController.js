const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");
const fs = require("fs");
const path = require("path");
const AsteriskManager = require("asterisk-manager");

class GatewayController {
  constructor() {
    this.gatewayGet = this.gatewayGet.bind(this);
    this.gatewayCreatePost = this.gatewayCreatePost.bind(this);
    this.gatewayUpdatePatch = this.gatewayUpdatePatch.bind(this);
    this.gatewayRemoveDelete = this.gatewayRemoveDelete.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.updatePJSIPFile = this.updatePJSIPFile.bind(this);
    this.reloadPjsip = this.reloadPjsip.bind(this);
  }

  async gatewayGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const gateways = await prisma.gateway.findMany({});

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Designs fetched!", {
          ...adminDataWithoutPassword,
          gateways,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting gateway", error);
    }
  }

  async gatewayCreatePost(req, res) {
    try {
      const { gatewayIpAddress, channels, userId, password } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);

      const gatewayAlreadyExist = await prisma.gateway.findFirst({
        where: {
          userId,
        },
      });

      if (gatewayAlreadyExist) {
        response.error(res, "Gateway Already Exist");
      }

      if (loggedInUser) {
        const gateway = await prisma.gateway.create({
          data: {
            gatewayIpAddress,
            channels: parseInt(channels),
            userId,
            password,
          },
        });

        this.writeFile(gateway);

        const gatewayFilePath = path.resolve(
          __dirname,
          "../asterisk/pjsip",
          `${gateway.userId.split(" ").join("_")}.conf`
        );

        this.updatePJSIPFile(gatewayFilePath);
        this.reloadPjsip();

        response.success(res, "Gateway Created Successfully", gateway);
      } else {
        response.error(res, "User not logged in");
      }
    } catch (error) {
      console.log("error while design creation ->", error);
    }
  }

  async gatewayUpdatePatch(req, res) {
    try {
      const { gatewayIpAddress, channels, userId, password } = req.body;

      const { gatewayId } = req.params;

      const gatewayFound = await prisma.gateway.findFirst({
        where: {
          id: parseInt(gatewayId),
        },
      });

      if (gatewayFound) {
        const updatedGateway = await prisma.gateway.update({
          where: {
            id: gatewayFound.id,
          },
          data: {
            gatewayIpAddress,
            channels: parseInt(channels),
            userId,
            password,
          },
        });

        response.success(res, "Gateway updated successfully!", {
          updatedGateway,
        });
      } else {
        response.error(res, "Run not found!");
      }
    } catch (error) {
      console.log("error while updating run controller", error);
    }
  }

  async gatewayRemoveDelete(req, res) {
    try {
      const token = req.cookies.token;
      const { gatewayId } = req.params;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const currentStatus = await prisma.gateway.findFirst({
          where: {
            id: parseInt(gatewayId),
          },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        if (currentStatus.status === 0) {
          const updatedGateway = await prisma.gateway.update({
            where: {
              id: currentStatus.id,
            },
            data: {
              status: 1,
            },
          });

          response.success(res, "Gateway status updated!", {
            ...adminDataWithoutPassword,
            updatedGateway,
          });
        } else {
          const updatedGateway = await prisma.gateway.update({
            where: {
              id: currentStatus.id,
            },
            data: {
              status: 0,
            },
          });

          response.success(res, "Gateway status updated!", {
            ...adminDataWithoutPassword,
            updatedGateway,
          });
        }
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while removing gateway", error);
    }
  }

  writeFile(gateway) {
    const dirPath = path.join(__dirname, "..", "asterisk/pjsip");

    const fileName = gateway.userId + ".conf";

    const filePath = path.join(dirPath, fileName);

    const lines = [
      `[${gateway.userId}]`,
      "type=auth",
      "auth_type=userpass",
      `password=${gateway.password}`,
      `username=${gateway.userId}\n`,
      `[${gateway.userId}]`,
      "type=aor",
      "max_contacts=1\n",
      `[${gateway.userId}]`,
      "type=endpoint",
      "transport=transport-udp",
      "context=internal",
      "disallow=all",
      "allow=!all,opus,ulaw,alaw,vp8,vp9",
      `auth=${gateway.userId}`,
      `aors=${gateway.userId}`,
      "direct_media=no",
      "dtmf_mode=rfc4733",
      "media_encryption=dtls",
      "media_use_received_transport=yes",
      "dtls_auto_generate_cert=yes",
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

  updatePJSIPFile(gatewayPath) {
    const pjsipFilePath = "/etc/asterisk/pjsip.conf";

    fs.readFile(pjsipFilePath, "utf8", (err, data) => {
      if (err) {
        return console.error("Error reading the file:", err);
      }

      // Write the modified contents back to the file
      fs.appendFile(
        pjsipFilePath,
        `\n#include ${gatewayPath}`,
        "utf8",
        (err) => {
          if (err) {
            return console.error("Error writing to the file:", err);
          }
        }
      );
    });
  }

  reloadPjsip() {
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
          command: "pjsip reload",
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

module.exports = new GatewayController();
