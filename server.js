const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// routers
const homeRouter = require("./routes/home");
const adminAuthRouter = require("./routes/adminAuth");
const adminUsersRouter = require("./routes/adminUsers");
const mappingRouter = require("./routes/mapping");
const centerRouter = require("./routes/center");
const bankCodeRouter = require("./routes/bankCode");
const centerUser = require("./routes/centerUser");
const loanFormRouter = require("./routes/loanForm");
const insuranceFormRouter = require("./routes/insuranceForm");
const creditCardFormRouter = require("./routes/creditCardForm");
const dematAccountFormRouter = require("./routes/dematAccountForm");
const formStatusRouter = require("./routes/formStatus");
const applicationReportRouter = require("./routes/applicationReport");
const pendingFormRouter = require("./routes/pendingForms");
const formPermissionsRouter = require("./routes/formPermissions");
const uploadRawDataRouter = require("./routes/uploadRawData");
const dataCorrectionRouter = require("./routes/dataCorrection");
const obdDataRouter = require("./routes/obdData");
const downloadDataRouter = require("./routes/downloadData");
const reportUploadRouter = require("./routes/reportUpload");
const bankDropdownRouter = require("./routes/bankDropdown");

// cookie parser
const cookieParser = require("cookie-parser");
const roleRouter = require("./routes/roles");

// parsing json
app.use(express.json());

// cors connection
app.use(
  cors({
    origin: "http://localhost:3006",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3006");
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

app.use("/", homeRouter);
app.use("/", adminAuthRouter);
app.use("/", adminUsersRouter);
app.use("/", roleRouter);
app.use("/", mappingRouter);
app.use("/", centerRouter);
app.use("/", centerUser);
app.use("/", bankCodeRouter);
app.use("/", creditCardFormRouter);
app.use("/", formStatusRouter);
app.use("/", applicationReportRouter);
app.use("/", pendingFormRouter);
app.use("/", loanFormRouter);
app.use("/", insuranceFormRouter);
app.use("/", dematAccountFormRouter);
app.use("/", formPermissionsRouter);
app.use("/", uploadRawDataRouter);
app.use("/", dataCorrectionRouter);
app.use("/", obdDataRouter);
app.use("/", downloadDataRouter);
app.use("/", reportUploadRouter);
app.use("/", bankDropdownRouter);

app.listen(process.env.PORT || 3003, () => {
  console.log(`Server listening at port no -> ${process.env.PORT}`);
});
