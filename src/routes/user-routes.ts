import { Router } from "express";
import { multerUpload, uploadToS3 } from "src/controllers/admin/s3-controller";
import {
  // buyAgain,
  buyPlan,
  getActivePlan,
  getLoginResponse,
  getPlans,
  logoutUser,
  setupIntent,
  userMoreInfo,
} from "src/controllers/auth/auth-controller";
import {
  getTaskById,
  submitTaskById,
  userHome,
  userSearch,
} from "src/controllers/user/home-controller";
import {
  applyJobs,
  getJobById,
  getJobs,
} from "src/controllers/user/job-controller";
import {
  addImage,
  addVideo,
  deleteImage,
  deleteVideo,
  updatePortfolio,
  userPortfolio,
} from "src/controllers/user/portfolio-controller";
import {
  changeCountry,
  changeLanguage,
  changePassword,
  deleteAccount,
  getNotifications,
  getNotificationSetting,
  getPlatformInfo,
  getUser,
  postNotificationSetting,
  updateSubscription,
  updateUser,
  userProfile,
} from "src/controllers/user/profile-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);
router.get("/setup-intent", setupIntent);
router.route("/plans").get(getPlans).post(buyPlan);
router.get("/get-login-response", getLoginResponse);
router.post("/logout", logoutUser);
// router.post("/buy-again", buyAgain);
router.get("/get-active-plan", getActivePlan);

const paidRouter = Router();

paidRouter.post("/upload", multerUpload, uploadToS3);

// HOME
paidRouter.get("/home", userHome);
paidRouter.route("/taskById/:id").get(getTaskById).post(submitTaskById);

// PROFILE
paidRouter.get("/profile", userProfile);
paidRouter.get("/get-user", getUser);
paidRouter.patch("/update-user", updateUser);
paidRouter.patch("/change-password", changePassword);
paidRouter.patch("/change-language", changeLanguage);
paidRouter.patch("/change-country", changeCountry);
paidRouter.get("/get-platform-info", getPlatformInfo);
paidRouter
  .route("/notification-setting")
  .get(getNotificationSetting)
  .patch(postNotificationSetting);
paidRouter.post("/delete-account", deleteAccount);
paidRouter.post("/update-subscription", updateSubscription);

// PORTFOLIO
paidRouter.get("/portfolio", userPortfolio);
paidRouter.patch("/portfolio", updatePortfolio);
paidRouter.route("/portfolio-video").post(addVideo).delete(deleteVideo);
paidRouter.route("/portfolio-image").post(addImage).delete(deleteImage);

// JOBS
paidRouter.route("/jobs").get(getJobs).post(applyJobs);
paidRouter.get("/jobs/:id", getJobById);

// SEARCH
paidRouter.get("/search-user", userSearch);

// NOTIFICATION
paidRouter.get("/get-notifications", getNotifications)

//============================== ADMIN Routes
export { router, paidRouter };
