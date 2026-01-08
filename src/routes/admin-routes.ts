import { Router } from "express";
import {
  getDashboard,
  getRevenue,
} from "src/controllers/admin/dashboard-controller";
import {
  createJob,
  getAllJobApplications,
  getJobDataCSV,
  getJobs,
  getJobsById,
  updateJobStatus,
} from "src/controllers/admin/job-controller";
import {
  createPlan,
  getAdminData,
  getPlans,
  getPlatformInfo,
  postPrivacyPolicy,
  postSupport,
  postTermAndCondition,
  updateAdminData,
  updatePlan,
} from "src/controllers/admin/plan-setting-controller";
import { multerUpload, uploadToS3 } from "src/controllers/admin/s3-controller";
import {
  addShootFeatures,
  addStudios,
  cancelBooking,
  deleteBookingSlot,
  deleteStudios,
  getActivities,
  getShootFeatures,
  getStudioById,
  getStudios,
  giveRatings,
} from "src/controllers/admin/studio-controller";
import {
  addCheckbox,
  addQuiz,
  createTask,
  deleteQuiz,
  getTaskById,
  getTasks,
  updateTask,
} from "src/controllers/admin/task-controller";
import {
  createEmployee,
  getAllTaskResponse,
  getEmployees,
  getEmployeesById,
  getUserById,
  getUsers,
  getUserTaskResponse,
  submitTaskResponse,
  updateEmployee,
} from "src/controllers/admin/user-controller";
import { getBookingById } from "src/controllers/user/booking-controller";
import { checkAdminAuth } from "src/middleware/check-auth";
import { AdminModel } from "src/models/admin/admin-schema";
import { hashPassword } from "src/utils/helper";

// Code
const router = Router();

// Dashboard-routes
router.route("/get-dashboard").get(getDashboard);
router.route("/revenue").get(getRevenue);

// Plan-routes
router.route("/price-plan").get(getPlans).post(createPlan).put(updatePlan);

// Review-tasks-routes
router.route("/userTask").get(getAllTaskResponse);
router.route("/userTask/:id").get(getUserTaskResponse).post(submitTaskResponse);

// Setting-routes
router.route("/get-platform-info").get(getPlatformInfo);
router.route("/privacy-policy").post(postPrivacyPolicy);
router.route("/term-and-condition").post(postTermAndCondition);
router.route("/support").post(postSupport);
router.route("/admin-data").get(getAdminData).put(updateAdminData);

// Job-management-routes
router.route("/jobs").post(createJob).get(getJobs);
router.route("/jobsById/:id").get(getJobsById).put(updateJobStatus);
router.route("/jobDataCSV/:id").get(getJobDataCSV);

// Job-application-routes
router.route("/get-all-applications").get(getAllJobApplications);

// Task-management-routes
router.route("/tasks").get(getTasks).post(createTask);
router.route("/tasksById/:id").put(updateTask).get(getTaskById);
router.route("/addQuiz/:id").post(addQuiz).delete(deleteQuiz);
router.route("/addCheckbox").post(addCheckbox);
router.post("/upload", multerUpload, uploadToS3);

// User-management-routes
router.route("/getUsers").get(getUsers);
router.route("/getUserById/:id").get(getUserById);

// Employee-management-routes
router.route("/employee").post(createEmployee).get(getEmployees);
router.route("/employee-by-id/:id").get(getEmployeesById).put(updateEmployee);

// Phase 2 -
// Manage Studios
router.route("/studio").post(addStudios).get(getStudios).delete(deleteStudios);
router.route("/studioById").get(getStudioById).delete(deleteBookingSlot);
router.route("/shootFeatures").get(getShootFeatures).post(addShootFeatures)

// Manage Activities
router.route("/activities").get(getActivities);
router.route("/activitiesById").get(getBookingById).post(giveRatings).put(cancelBooking);


// Temperary route for creating an admin
router.post("/create-admin", async (req, res) => {
  try {
    const { fullName, email, password, image } = req.body;
    const hashedPassword = await hashPassword(password);
    // await AdminModel.create({
    //   fullName,
    //   email,
    //   password: hashedPassword,
    //   image: image || null,
    //   country: "UK",
    // });

    return res.status(201).json({ message: "Admin created successfully." });
  } catch (error) {
    console.error("Error creating admin:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

export { router };
