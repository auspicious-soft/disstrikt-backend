import { Router } from "express";
import { createPlan, getPlans, updatePlan } from "src/controllers/admin/admin-controller";

// Code
const router = Router();

// Plan-routes
router.route("/price-plan").get(getPlans).post(createPlan).put(updatePlan)

export { router };