import { Router } from "express";
import { buyPlan, getPlans, setupIntent, userMoreInfo } from "src/controllers/auth/auth-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);
router.get("/setup-intent", setupIntent)
router.route("/plans").get(getPlans).post(buyPlan);

const paidRouter = Router();

paidRouter.get("/home", async(req, res)=>{
    console.log("Home-Page", req.user)
})

//============================== ADMIN Routes
export { router , paidRouter};
