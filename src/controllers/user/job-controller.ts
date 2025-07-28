import { Request, Response } from "express";
import { jobServices } from "src/services/admin/admin-services";
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
    const { page, limit, gender, age, branch } = req.query;
    req.body.language = userData.language || "en";
    const response = await jobServices.getJobs({
      ...req.query,
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
