import { Router } from "express";
import { createPlan, getPlans } from "src/controllers/admin/plan-controller";

// Code
const router = Router();

// Plan-routes
router.route("/price-plan").get(getPlans).post(createPlan)

export { router };