import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { testPlanModel } from "src/models/admin/test-plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserModel } from "src/models/user/user-schema";
import { authServices } from "src/services/auth/auth-services";
import { portfolioServices } from "src/services/user/user-services";
import { countries, languages } from "src/utils/constant";

import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      language,
      fullName,
      email,
      password,
      country,
      fcmToken,
      userType = "mobile",
    } = req.body;

    if (!fullName || !email || !password) {
      throw new Error("registerRequiredFields");
    }

    if (!languages.includes(language) || !countries.includes(country)) {
      throw new Error("invalidRegisterFields");
    }

    if (!fcmToken) {
      throw new Error("FCM is requird");
    }
    const blockedDomains = ["yopmail.com", "tempmail.com", "mailinator.com"];
    const emailDomain = email.split("@")[1]?.toLowerCase();
    // if(blockedDomains.includes(emailDomain)){
    //   throw new Error("invalidEmailDomain")
    // }

    await UserModel.findOneAndDelete({
      $or: [
        { email, isVerifiedEmail: false, isVerifiedPhone: false },
        {
          phone: req.body.phone,
          email,
          isVerifiedEmail: false,
          isVerifiedPhone: false,
        },
      ],
    });

    const response = await authServices.register({
      language,
      fullName,
      email,
      password,
      country,
      authType: "EMAIL",
      userType,
      fcmToken,
      ...req.body,
    });
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value, language } = req.body;
    if (!otp || !value || !language) {
      throw new Error("otp, value and language is required");
    }
    const response = await authServices.verifyOtp({
      otp,
      value,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { value, purpose, language } = req.body;
    if (!purpose || !value || !language) {
      throw new Error("otp, purpose and language is required");
    }
    const response = await authServices.resendOtp({
      purpose,
      value,
      userType: "USER",
      language,
    });
    return OK(res, response || {}, req.body.language || "en", "otpResent");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      fcmToken,
      language,
      userType = "mobile",
    } = req.body;
    if (!email || !password || !fcmToken || !language) {
      throw new Error("Email, language, Password & FCM is required");
    }
    const response = await authServices.login({
      email: email.toLowerCase(),
      password,
      fcmToken,
      userType,
      authType: "EMAIL",
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { authType, idToken, fcmToken, country, language, deviceType } =
      req.body;
    if (
      !authType ||
      !idToken ||
      !fcmToken ||
      !country ||
      !language ||
      !["GOOGLE", "APPLE"].includes(authType) ||
      !["ANDROID", "IOS"].includes(deviceType)
    ) {
      throw new Error(
        "idToken, fcmToken, country, language and Valid authType or deviceType is required"
      );
    }
    const response = await authServices.socialLogin({
      authType,
      idToken,
      fcmToken,
      country,
      language,
      deviceType,
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const forgetPassword = async (req: Request, res: Response) => {
  try {
    const { email, language } = req.body;
    if (!email || !language) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
      language,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const verifyResetPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value, language } = req.body;
    if (!value || !language || !otp) {
      throw new Error("Email, value and language is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      otp,
      value,
      language,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password, language } = req.body;
    if (!password || !language) {
      throw new Error("Email, value and language is required");
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      language,
      userType: "USER",
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const userMoreInfo = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;
    const { measurements, dob, gender } = req.body;
    // if (!measurements || !dob || !gender) {
    //   throw new Error("Measurements, DOB, and Gender is required");
    // }

    // if (!["MALE", "FEMALE"].includes(gender)) {
    //   throw new Error("Gender can be either MALE or FEMALE");
    // }

    const response = await authServices.userMoreInfo({
      measurements,
      dob,
      gender,
      userData: req.user,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;
    const response = await authServices.getPlans({
      language: userData.language,
      country: userData.country,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const setupIntent = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;

    const response = await authServices.setupIntent({
      language: userData.language,
      country: userData.country,
      ...userData,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const buyPlan = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;

    const { planId, currency, paymentMethodId, deviceType = null } = req.body;
    const { orderId } = req.body;

    console.log(
      userData.id,
      planId,
      currency,
      paymentMethodId,
      orderId,
      deviceType
    );

    if (deviceType === "IOS") {
      const checkOrderId = await SubscriptionModel.findOne({
        orderId: orderId,
      });

      if (checkOrderId) {
        throw new Error("Order ID already used");
      }

      const checkSubscription = await SubscriptionModel.findOne({
        userId: userData.id,
      });

      const plan = await planModel.findOne({ iosProductId: planId });

      if (!checkSubscription) {
        await SubscriptionModel.create({
          userId: userData.id,
          orderId: orderId,
          deviceType: deviceType,
          planId: plan?._id,
          status: "trialing",
        });
      } else {
        checkSubscription.orderId = orderId;
        await checkSubscription.save();
      }

      return OK(res, {}, req.body.language || "en", "loginSuccess");
    } else {
      if (!orderId && userData.userType === "mobile") {
        throw new Error("orderId is required");
      }

      if ((!planId || !currency) && userData.userType === "web") {
        throw new Error("planId, currency, and paymentMethodId is required");
      }

      if (planId) {
        userData.planId = planId;
      }

      const response = await authServices.buyPlan({
        language: userData.language,
        country: userData.country,
        userId: userData.id.toString(),
        planId,
        currency,
        userType: userData.userType,
        paymentMethodId,
        orderId,
        ...userData,
      });
      return OK(res, response || {}, req.body.language || "en", "loginSuccess");
    }
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getLoginResponse = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.getLoginResponse({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const buyAgain = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { planId } = req.body;
    const plan =
      process.env.PAYMENT === "DEV"
        ? await testPlanModel.findById(planId)
        : await planModel.findById(planId);
    if (!plan) {
      throw new Error("Invalid plan Id");
    }
    const response = await authServices.buyAgain({
      userId: userData.id,
      planId,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getActivePlan = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const response = await SubscriptionModel.findOne({
      userId: userData.id,
    }).lean();
    const data = { ...response, ...userData };
    return OK(res, data || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.logoutUser({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en", "logoutSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Admin Controllers

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("Email & Password required");
    }
    const response = await authServices.adminLogin({
      email,
      password,
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminForgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
      admin: true,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { value, otp } = req.body;
    if (!value) {
      throw new Error("Email is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      value,
      otp,
      userType: "ADMIN",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = req.body;
    if (!password) {
      throw new Error("Password is required");
    }
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Portfolio Controllers

export const userPortfolio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }

    const userData = await UserModel.findById(id).lean();
    const response = await portfolioServices.userPortfolio({
      userData: { ...userData, id: userData?._id },
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
