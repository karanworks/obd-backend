const express = require("express");
const EmployeeRouter = express.Router({ mergeParams: true });
const EmployeeController = require("../controllers/employeeController");

EmployeeRouter.get("/employees", EmployeeController.employeesGet);
EmployeeRouter.post("/employee/create", EmployeeController.employeeCreatePost);
EmployeeRouter.patch(
  "team/:teamId/employee/:employeeId/edit",
  EmployeeController.employeeUpdatePatch
);
// EmployeeRouter.delete(
//   "/center/:centerId/center-user/:centerUserId/delete",
//   EmployeeController.centerUserRemoveDelete
// );

module.exports = EmployeeRouter;
