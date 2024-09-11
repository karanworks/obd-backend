const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
require("./utils/callingCronJob");

// routers
const homeRouter = require("./routes/home");
const adminAuthRouter = require("./routes/adminAuth");
const adminUsersRouter = require("./routes/adminUsers");
const mappingRouter = require("./routes/mapping");
const campaignsRouter = require("./routes/campaigns");
const designRouter = require("./routes/design");
const runRouter = require("./routes/run");
const gatewayRouter = require("./routes/gateway");
const TestIVRRouter = require("./routes/testIvr");
const ReportRouter = require("./routes/report");

// cookie parser
const cookieParser = require("cookie-parser");
const roleRouter = require("./routes/roles");

// parsing json
app.use(express.json());
app.use("/audio", express.static("asterisk/audio"));

// cors connection
app.use(
  cors({
    //  origin: "http://192.168.1.5:3009",
    origin: "http://localhost:3009",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3009");
  //  res.setHeader("Access-Control-Allow-Origin", "http://192.168.1.5:3009");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PUT, POST, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  next();
});

app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hi Buddy, I am working!");
});

app.use("/", homeRouter);
app.use("/", adminAuthRouter);
app.use("/", adminUsersRouter);
app.use("/", roleRouter);
app.use("/", mappingRouter);
app.use("/", campaignsRouter);
app.use("/", designRouter);
app.use("/", runRouter);
app.use("/", gatewayRouter);
app.use("/", TestIVRRouter);
app.use("/", ReportRouter);

app.listen(process.env.PORT || 3003, () => {
  console.log(`Server listening at port no -> ${process.env.PORT}`);
});
