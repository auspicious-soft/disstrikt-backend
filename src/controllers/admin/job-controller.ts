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
    const {
      minAge,
      maxAge,
      date,
      time,
      pay,
      currency,
      countryCode,
      minHeightInCm,
    } = req.body;

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
export const getJobsById = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as any;
    const { id: jobId } = req.params;

    const validStatus = ["SELECTED", "REJECTED", "PENDING", "ALL"];

    if (!validStatus.includes(status)) {
      throw new Error("Invalid status keys");
    }

    const response = await jobServices.getJobsById({ ...req.query, jobId });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const updateJobStatus = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const { status } = req.body;

    if (status !== "SELECTED" && status !== "REJECTED") {
      throw new Error("Invalid status");
    }
    const response = await jobServices.updateJobStatus({ jobId, status });

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getAllJobApplications = async (req: Request, res: Response) => {
  try {
    const { status = "ALL" } = req.query;

    const validStatus = ["SELECTED", "REJECTED", "PENDING", "ALL"];

    if (!validStatus.includes(status as string)) {
      throw new Error("Invalid status keys");
    }
    const response = await jobServices.getAllJobApplications({status, ...req.query });

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getJobDataCSV = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;

    const response = await jobServices.getJobDataCSV({ jobId });

    res.header("Content-Type", "text/csv");
    res.attachment(`job_${response.title}_applications.csv`);
    res.send(response?.csv || null);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
