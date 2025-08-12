import { Request, Response } from "express";
import { userJobServices } from "src/services/user/user-services";
import { countries, languages } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

export const getJobs = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { page, limit, gender, age, branch, type } = req.query;
    req.body.language = userData.language || "en";
    const response = await userJobServices.getJobs({
      ...req.query,
      userId: userData?.id || null,
      language: req.body.language || "en",
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const applyJobs = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { jobId } = req.body;
    const response = await userJobServices.applyJobs({
      jobId,
      language: req.body.language || "en",
      ...userData,
    });
    return OK(res, response || {}, req.body.language, "jobAppliedSuccessfully");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { id } = req.params;
    const response = await userJobServices.getJobById({
      jobId:id,
      language: req.body.language || "en",
      ...userData,
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
