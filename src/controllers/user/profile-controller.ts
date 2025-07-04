import { Request, Response } from "express";
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

    const { heightCm, bustCm, waistCm, hipsCm, gender, dob, fullName, image} =
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
      id: userData.id
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
