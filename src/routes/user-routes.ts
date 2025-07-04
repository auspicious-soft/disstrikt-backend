import { Router } from "express";
import { buyPlan, getPlans, setupIntent, userMoreInfo } from "src/controllers/auth/auth-controller";
import { userHome } from "src/controllers/user/home-controller";
import { getUser, updateUser, userProfile } from "src/controllers/user/profile-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);
router.get("/setup-intent", setupIntent)
router.route("/plans").get(getPlans).post(buyPlan);

const paidRouter = Router();
// HOME
paidRouter.get("/home", userHome)



// PROFILE
paidRouter.get("/profile", userProfile)
paidRouter.get("/get-user", getUser)
paidRouter.patch("/update-user", updateUser)
paidRouter.patch("/change-password")
paidRouter.patch("/change-language")
paidRouter.patch("/change-country")


//============================== ADMIN Routes
export { router , paidRouter};
