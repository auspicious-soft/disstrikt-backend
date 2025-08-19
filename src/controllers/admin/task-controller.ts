import { Request, Response } from "express";
import { taskServices } from "src/services/admin/admin-services";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const createTask = async (req: Request, res: Response) => {
  try {
    const response = await taskServices.createTask({});
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
    const response = await taskServices.updateTask({data : req.body, taskId: req.params.id});
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
    const {page = 1, limit = 10} = req.query;
    const response = await taskServices.getTasks({page, limit});
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
    const {id} = req.params;
    const response = await taskServices.getTaskById({taskId: id});
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
    const {taskId, quiz} = req.body;
    const response = await taskServices.addQuiz({taskId, quiz});
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
    const {id: quizId} = req.params;
    const response = await taskServices.deleteQuiz({quizId});
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
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
