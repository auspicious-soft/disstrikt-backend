import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { planServices } from "src/services/admin/plan-services";
import { authServices } from "src/services/auth/auth-services";
import { countries, languages } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";
import { validateCreatePlanPayload } from "src/validation/validPlan";

export const createPlan = async (req: Request, res: Response) => {
  try {
    const payload = validateCreatePlanPayload(req.body, "create");

    if (!payload.data) {
      throw new Error("Invalid payload: data is missing.");
    }
    const checkExist = await planModel
      .findOne({
        $or: [
          { key: payload.data.key },
          { "name.en": new RegExp(`^${payload.data.name.en}$`, "i") },
        ],
      })
      .lean();

    if (checkExist) {
      throw new Error("A plan with the same key or name already exists.");
    }

    const response = await planServices.createPlan(payload.data);
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getPlans = async (req: Request, res: Response) => {
  try {
    const response = await planServices.getPlans({});

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { planId, ...restData } = req.body;
    const response = await planServices.updatePlan(planId, restData);
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
