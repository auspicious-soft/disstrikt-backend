import { Request, Response } from "express";
import { userServices } from "src/services/admin/admin-services";
import { countries } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const getUsers = async (req: Request, res: Response) => {
  try {
    let { page = 1, limit = 10, search, sort = null, country = null } = req.query;

    if (sort && sort !== "jobHighToLow" && sort !== "jobLowToHigh") {
      throw new Error("Invalid sort type");
    }

    if (country && !countries.includes(country as string)) {
      throw new Error("Invalid Country");
    }

    const response = await userServices.getUsers({...req.query});
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getUserById = async (req: Request, res: Response) => {
  try {
    if(!req.params.id){
        throw new Error("User Id is required")
    }
    const response = await userServices.getUserById({userId: req.params.id});
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getUserTaskResponse = async (req: Request, res: Response) => {
  try {
    const response = await userServices.getUserTaskResponse({});
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
