import { Router } from "express";
import {
  createPlan,
  getPlans,
  getPlatformInfo,
  postPrivacyPolicy,
  postSupport,
  postTermAndCondition,
  updatePlan,
} from "src/controllers/admin/admin-controller";
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
