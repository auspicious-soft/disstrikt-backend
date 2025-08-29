import { Request, Response } from "express";
import { AdminModel } from "src/models/admin/admin-schema";
import { planModel } from "src/models/admin/plan-schema";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { planServices } from "src/services/admin/admin-services";
import { hashPassword, verifyPassword } from "src/utils/helper";

import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";
import { validateCreatePlanPayload } from "src/validation/validPlan";

// Plans---------------------->

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

export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const response = await planServices.handleStripeWebhook(req);
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getPlatformInfo = async (req: Request, res: Response) => {
  try {
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {},
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const postTermAndCondition = async (req: Request, res: Response) => {
  try {
    const { ...termAndCondition } = req.body;
    if (!termAndCondition || Object.keys(termAndCondition).length !== 4) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          termAndCondition,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(
      res,
      response?.termAndCondition || {},
      req.body.language || "en"
    );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const postPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const { ...privacyPolicy } = req.body;
    if (!privacyPolicy || Object.keys(privacyPolicy).length !== 4) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          privacyPolicy,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(
      res,
      response?.privacyPolicy || {},
      req.body.language || "en"
    );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const postSupport = async (req: Request, res: Response) => {
  try {
    const { ...support } = req.body;
    if (
      !support.phone ||
      !support.email ||
      Object.keys(support.address).length !== 4
    ) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          support,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(res, response?.support || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const adminData = await AdminModel.find().select(
      "fullName email image country language"
    );
    return OK(res, adminData[0] || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const updateAdminData = async (req: Request, res: Response) => {
  try {
    const { oldPassword, password, ...restData } = req.body;
    const checkExist = await AdminModel.find();

    const passwordStatus = await verifyPassword(
      oldPassword,
      checkExist[0]?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }

    const hashedPassword = await hashPassword(password);

    await AdminModel.findByIdAndUpdate(checkExist[0]._id, {
      $set: { ...restData, password: hashedPassword },
    });

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
