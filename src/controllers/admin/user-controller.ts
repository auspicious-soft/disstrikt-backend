import { Request, Response } from "express";
import { AdminLogsModel } from "src/models/admin/admin-logs-schema";
import { AdminModel } from "src/models/admin/admin-schema";
import { userServices } from "src/services/admin/admin-services";
import { countries } from "src/utils/constant";
import { hashPassword, saveLogs } from "src/utils/helper";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const getUsers = async (req: Request, res: Response) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      sort = null,
      country = null,
    } = req.query;

    if (sort && sort !== "jobHighToLow" && sort !== "jobLowToHigh") {
      throw new Error("Invalid sort type");
    }

    if (country && !countries.includes(country as string)) {
      throw new Error("Invalid Country");
    }

    const response = await userServices.getUsers({ ...req.query });
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
    if (!req.params.id) {
      throw new Error("User Id is required");
    }
    const response = await userServices.getUserById({ userId: req.params.id });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getAllTaskResponse = async (req: Request, res: Response) => {
  try {
    const response = await userServices.getAllTaskResponse({ ...req.query });
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
    const { id: taskId } = req.params;
    const response = await userServices.getUserTaskResponse({ taskId });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const submitTaskResponse = async (req: Request, res: Response) => {
  try {
    const { id: taskId } = req.params;
    if (!taskId) {
      throw new Error("Either task id or rating is not present");
    }
    const response = await userServices.submitTaskResponse({
      taskId,
      rating: req.body.rating,
    });
    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Rated User for Task Number ${response} with rating ${req.body.rating}`,
      referenceModel: "taskresponse",
      referenceId: taskId,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Employee-management-controller with services

export const createEmployee = async (req: Request, res: Response) => {
  try {
    let { fullName, email, password, country = "UK" } = req.body;

    const checkExist = await AdminModel.findOne({ email });

    if (!fullName || !email || !password) {
      throw new Error("Fullname, email and password are required");
    }

    if (checkExist) {
      throw new Error("Employee with this email already exist");
    }

    const hashedPassword = await hashPassword(password);

    const response = await AdminModel.create({
      fullName,
      email,
      password: hashedPassword,
      country,
    });

    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    let { search = "" } = req.query;

    const response = await AdminModel.find({
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
      role: "EMPLOYEE",
    })
      .select("-password -__v")
      .lean();

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getEmployeesById = async (req: Request, res: Response) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    let { id: employeeId } = req.params;

    const checkExist = await AdminModel.findOne({
      _id: employeeId,
    }).lean();

    const logs = await AdminLogsModel.find({ adminId: employeeId })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 })
      .lean();

    const data = {
      ...checkExist,
      logs,
      total: await AdminLogsModel.countDocuments({ adminId: employeeId }),
      page,
      limit,
      totalPages: Math.ceil(logs.length / +limit),
    };

    return OK(res, data || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    let {
      fullName,
      email,
      password,
      country = "UK",
      isBlocked = false,
    } = req.body;
    let { id: employeeId } = req.params;

    const checkExist = await AdminModel.findOne({
      email,
      _id: { $ne: employeeId },
    });

    if (checkExist) {
      throw new Error("Employee with this email already exist");
    }

    const empoyeeData = await AdminModel.findById(employeeId);

    if (!empoyeeData) {
      throw new Error("Employee not found");
    }

    if (password) {
      password = await hashPassword(password);
      empoyeeData.password = password;
    }

    if (fullName) empoyeeData.fullName = fullName;
    if (email) empoyeeData.email = email;
    if (country) empoyeeData.country = country;
    empoyeeData.isBlocked = isBlocked;

    await empoyeeData.save();

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
