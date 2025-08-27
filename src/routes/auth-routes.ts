import { Request, Response, Router } from "express";
import { NotificationService } from "src/utils/FCM/fcm";

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
  userPortfolio,
  verifyOtp,
  verifyResetPasswordOtp,
} from "src/controllers/auth/auth-controller";
import { translateJobFields } from "src/utils/helper";

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

//============================== PORTFOLIO Routes
router.get("/portfolio/:id", userPortfolio);

//============================== TEST Routes

router.post("/send-push", async (req: Request, res: Response) => {
  try {
    const { userIds, type, referenceId } = req.body;

    // await NotificationService(userIds, type, referenceId);
    // const data = await translateJobFields({text:"I am Ankit Sharma, i don't know other languages"})
  } catch (e) {
    console.log(e);
  }
});

export { router };
