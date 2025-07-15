import { Router } from "express";
import {
  adminForgetPassword,
  adminLogin,
  adminResetPassword,
  adminVerifyOtp,
  forgetPassword,
  login,
  registerUser,
  resendOtp,
  resetPassword,
  socialLogin,
  verifyOtp,
  verifyResetPasswordOtp,
} from "src/controllers/auth/auth-controller";

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
router.post("/social-login", socialLogin);

//============================== ADMIN Routes

router.post("/admin/login", adminLogin);
router.post("/admin/forget-password", adminForgetPassword);
router.post("/admin/verify-otp", adminVerifyOtp);
router.post("/admin/reset-password", adminResetPassword);

export { router };
