import { Router } from "express";
import { createJob, getJobDataCSV, getJobs, getJobsById, updateJobStatus } from "src/controllers/admin/job-controller";
import {
  createPlan,
  getPlans,
  getPlatformInfo,
  postPrivacyPolicy,
  postSupport,
  postTermAndCondition,
  updatePlan,
} from "src/controllers/admin/plan-setting-controller";
import { multerUpload, uploadToS3 } from "src/controllers/admin/s3-controller";
import { addCheckbox, addQuiz, createTask, deleteQuiz, getTaskById, getTasks, updateTask } from "src/controllers/admin/task-controller";
import { AdminModel } from "src/models/admin/admin-schema";
import { hashPassword } from "src/utils/helper";

// Code
const router = Router();

// Plan-routes
router.route("/price-plan").get(getPlans).post(createPlan).put(updatePlan);

// Setting-routes
router.route("/get-platform-info").get(getPlatformInfo);
router.route("/privacy-policy").post(postPrivacyPolicy);
router.route("/term-and-condition").post(postTermAndCondition);
router.route("/support").post(postSupport);

// Job-management-routes
router.route("/jobs").post(createJob).get(getJobs)
router.route("/jobsById/:id").get(getJobsById).put(updateJobStatus)
router.route("/jobDataCSV/:id").get(getJobDataCSV)

// Task-management-routes
router.route("/tasks").get(getTasks)
router.route("/tasksById/:id").post(createTask).put(updateTask).get(getTaskById)
router.route("/addQuiz/:id").post(addQuiz).delete(deleteQuiz)
router.route("/addCheckbox").post(addCheckbox)
router.post("/upload", multerUpload, uploadToS3);

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
