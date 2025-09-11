import { Request, Response } from "express";
import { taskServices } from "src/services/admin/admin-services";
import { saveLogs } from "src/utils/helper";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const createTask = async (req: Request, res: Response) => {
  try {
    const response = await taskServices.createTask({ ...req.body });
    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Created a Task - ${response?.taskNumber || "Unknown"}`,
      type: "TASK",
      referenceId: null,
    });
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const updateTask = async (req: Request, res: Response) => {
  try {
    const response = await taskServices.updateTask({
      data: req.body,
      taskId: req.params.id,
    });

    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Updated a Task - ${response?.taskNumber || "Unknown"}`,
      type: "TASK",
      referenceId: null,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, taskType } = req.query;
    const response = await taskServices.getTasks({
      page,
      limit,
      search,
      taskType,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await taskServices.getTaskById({ taskId: id });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const addQuiz = async (req: Request, res: Response) => {
  try {
    const { quiz } = req.body;
    const taskId = req.params.id;
    const response = await taskServices.addQuiz({ taskId, quiz });
    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Added a Quiz to Task - ${response.taskNumber}`,
      type: "TASK",
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

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { id: quizId } = req.params;
    const response = (await taskServices.deleteQuiz({ quizId })) as any;
    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Deleted a Quiz from Task - ${response?.taskNumber || "Unknown"}`,
      type: "TASK",
      referenceId: null,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const addCheckbox = async (req: Request, res: Response) => {
  try {
    const response = await taskServices.addCheckbox(req.body);
    const adminUser = req.user as any;
    await saveLogs({
      ...adminUser,
      logs: `Added a Checkbox to Task - ${response.taskNumber}`,
      type: "TASK",
      referenceId: req.body.taskId,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
