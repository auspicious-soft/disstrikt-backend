import { Router } from "express";
import {
  buyPlan,
  getLoginResponse,
  getPlans,
  logoutUser,
  setupIntent,
  userMoreInfo,
} from "src/controllers/auth/auth-controller";
import { userHome } from "src/controllers/user/home-controller";
import {
  changeCountry,
  changeLanguage,
  changePassword,
  getPlatformInfo,
  getUser,
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

const paidRouter = Router();

// HOME
paidRouter.get("/home", userHome);

// PROFILE
paidRouter.get("/profile", userProfile);
paidRouter.get("/get-user", getUser);
paidRouter.patch("/update-user", updateUser);
paidRouter.patch("/change-password", changePassword);
paidRouter.patch("/change-language", changeLanguage);
paidRouter.patch("/change-country", changeCountry);
paidRouter.get("/get-platform-info", getPlatformInfo)

//============================== ADMIN Routes
export { router, paidRouter };
