import { Request, Response } from "express";
import { jobServices, planServices } from "src/services/admin/admin-services";
import { countries } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const createJob = async (req: Request, res: Response) => {
  try {
    const { minAge, maxAge, date, time, pay, currency, countryCode, minHeightInCm } = req.body;

    if (
      !minAge ||
      !maxAge ||
      !date ||
      !time ||
      !pay ||
      !currency ||
      !countryCode ||
      !minHeightInCm
    ) {
      throw new Error("invalidFields");
    }

    const response = await jobServices.createJob(req.body);
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { sort = "newToOld", search, country } = req.query as any;

    const validSort = ["oldToNew", "newToOld", "highToLowPay", "lowToHighPay"];

    if (!validSort.includes(sort)) {
      throw new Error("Invalid sort keys");
    }

    if (country && !countries.includes(country)) {
      throw new Error("Invalid country code");
    }

    const response = await jobServices.getJobs({ ...req.query });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
