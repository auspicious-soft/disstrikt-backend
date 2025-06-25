import { Request, Response } from "express";
import { authServices } from "src/services/auth/auth-services";
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
    const { language, fullName, email, password, country, fcmToken } = req.body;
    if (!fullName || !email || !password) {
      throw new Error("registerRequiredFields");
    }

    if (!languages.includes(language) || !countries.includes(country)) {
      throw new Error("invalidRegisterFields");
    }

    if (!fcmToken) {
      throw new Error("FCM is requird");
    }

    const response = await authServices.register({
      language,
      fullName,
      email,
      password,
      country,
      authType: "EMAIL",
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
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, fcmToken, language } = req.body;
    if (!email || !password || !fcmToken || !language) {
      throw new Error("Email, language, Password & FCM is required");
    }
    const response = await authServices.login({
      email,
      password,
      fcmToken,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return UNAUTHORIZED(res, err.message, req.body.language || "en");
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
    if (!measurements || !dob || !gender) {
      throw new Error("Measurements, DOB, and Gender is required");
    }

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
