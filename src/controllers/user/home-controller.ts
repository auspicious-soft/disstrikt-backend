import { Request, Response } from "express";
import { homeServices, userSearchServices } from "src/services/user/user-services";
import { countries, languages } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

export const userHome = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const {page = 1, limit = 10} = req.query;
    const response = await homeServices.getUserHome({
      userData,
      page : Number(page),
      limit : Number(limit)
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {id} = req.params;
    req.body.language = userData.language || "en";
    const response = await homeServices.getTaskById({
      userData,
      taskId: id
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const submitTaskById = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {id} = req.params;
    req.body.language = userData.language || "en";
    const response = await homeServices.submitTaskById({
      userData,
      taskId: id,
      body: req.body
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};


//SEARCH CONTROLLER
export const userSearch = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await userSearchServices.searchUsers({
      userData,
      req
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
