import { Request, Response } from "express";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { TokenModel } from "src/models/user/token-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { profileServices } from "src/services/user/user-services";
import { countries, languages } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

export const userProfile = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await profileServices.profile({
      userData,
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await profileServices.getUser({
      userData,
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";

    const { heightCm, bustCm, waistCm, hipsCm, gender, dob, fullName, image } =
      req.body;

    if (heightCm && !Number.isInteger(heightCm)) {
      throw new Error("invalidFields");
    }
    if (bustCm && !Number.isInteger(bustCm)) {
      throw new Error("invalidFields");
    }
    if (waistCm && !Number.isInteger(waistCm)) {
      throw new Error("invalidFields");
    }
    if (hipsCm && !Number.isInteger(hipsCm)) {
      throw new Error("invalidFields");
    }
    if (dob && typeof dob !== "string") {
      throw new Error("invalidFields");
    }
    if (fullName && typeof dob !== "string") {
      throw new Error("invalidFields");
    }
    if (image && typeof image !== "string") {
      throw new Error("invalidFields");
    }

    const response = await profileServices.updateUser({
      heightCm,
      bustCm,
      waistCm,
      hipsCm,
      gender,
      dob,
      fullName,
      image,
      id: userData.id,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new Error("invalidFields");
    }

    const response = await profileServices.changePassword({
      id: userData.id,
      oldPassword,
      newPassword,
      language: req.body.language,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const changeLanguage = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { updatedLanguage } = req.body;

    if (!languages.includes(updatedLanguage)) {
      throw new Error("invalidFields");
    }

    const response = await profileServices.changeLanguage({
      id: userData.id,
      language: updatedLanguage,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const changeCountry = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { country } = req.body;

    if (!countries.includes(country)) {
      throw new Error("invalidFields");
    }

    const response = await profileServices.changeCountry({
      id: userData.id,
      country,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getPlatformInfo = async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;

    if (!["privacyPolicy", "support", "termAndCondition"].includes(key)) {
      throw new Error("invalidFields");
    }

    const response = await PlatformInfoModel.findOne({
      isActive: true,
    });

    let result = {};
    if (response) {
      if (key === "privacyPolicy")
        result = { privacyPolicy: response.privacyPolicy };
      else if (key === "support") result = { support: response.support };
      else if (key === "termAndCondition")
        result = { termAndCondition: response.termAndCondition };
    }

    return OK(res, result, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getNotificationSetting = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    const response = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    return OK(res, response?.notificationSettings || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const postNotificationSetting = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {
      jobAlerts,
      tasksPortfolioProgress,
      profilePerformance,
      engagementMotivation,
    } = req.body;
    if (
      typeof jobAlerts !== "boolean" ||
      typeof tasksPortfolioProgress !== "boolean" ||
      typeof profilePerformance !== "boolean" ||
      typeof engagementMotivation !== "boolean"
    ) {
      throw new Error("invalidFields");
    }
    const response = await UserInfoModel.findOneAndUpdate(
      { userId: userData.id },
      {
        $set: {
          notificationSettings: {
            jobAlerts,
            tasksPortfolioProgress,
            profilePerformance,
            engagementMotivation,
          },
        },
      },
      {
        new: true,
      }
    );

    return OK(res, response?.notificationSettings || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    await UserModel.findByIdAndUpdate(userData.id, {
      isDeleted: true,
    });

    await TokenModel.findOneAndDelete({
      userId: userData.id,
    });

    //Need to write cancel subscripiton code as well

    return OK(res, {}, req.body.language, "accountDeleted");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {type, planId} = req.body;

    if(!["upgrade", "cancelTrial", "cancelSubscription"].includes(type)){
      throw new Error("invalidFields")
    }

    if(type === "upgrade" && !planId){
      throw new Error("PlanId is required")
    }

    const response = await profileServices.updatePlan({type, planId, userData})
 
    return OK(res, {}, req.body.language, "accountDeleted");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
