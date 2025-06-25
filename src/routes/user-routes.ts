import { Router } from "express";
import { getPlans, userMoreInfo } from "src/controllers/auth/auth-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);
router.route("/plans").get(getPlans);

//============================== ADMIN Routes
export { router };
