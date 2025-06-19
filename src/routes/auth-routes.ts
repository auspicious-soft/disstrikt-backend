import { Router } from "express";
import {
  forgetPassword,
  login,
  registerUser,
  resendOtp,
  resetPassword,
  verifyOtp,
  verifyResetPasswordOtp,
} from "src/controllers/auth-controller";

// Code
const router = Router();

//============================== USER Routes
router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forget-password", forgetPassword);
router.post("/verify-reset-otp", verifyResetPasswordOtp);
router.post("/reset-password", resetPassword);
router.post("/social-login");

//============================== ADMIN Routes
export { router };
