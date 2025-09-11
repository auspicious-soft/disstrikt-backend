import mongoose, { Document, Schema } from "mongoose";

export interface IAdminLogs extends Document {
  fullName: string;
  email: string;
  adminId: mongoose.Schema.Types.ObjectId;
  jobId?: mongoose.Schema.Types.ObjectId;
  taskId?: mongoose.Schema.Types.ObjectId;
  logs: string;
  type: "JOB" | "TASK";
  role: "ADMIN" | "EMPLOYEE";
  createdAt?: Date;
  updatedAt?: Date;
}

const adminLogsSchema = new Schema<IAdminLogs>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "job",
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "taskresponse",
    },
    type: {
      type: String,
      enum: ["JOB", "TASK"],
      required: true,
    },
    logs: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      default: "EMPLOYEE",
    },
  },
  { timestamps: true }
);

export const AdminLogsModel = mongoose.model<IAdminLogs>(
  "adminlogs",
  adminLogsSchema
);
