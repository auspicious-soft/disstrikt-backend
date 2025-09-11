import mongoose, { Document, Schema } from "mongoose";

export interface IAdminLogs extends Document {
  fullName: string;
  email: string;
  adminId: mongoose.Schema.Types.ObjectId;
  referenceId?: mongoose.Schema.Types.ObjectId;
  logs: string;
  role: "ADMIN" | "EMPLOYEE";
  referenceModel?: string; // Add this field for refPath
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
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: ["jobs", "tasks", "appliedJobs", "taskresponse"], // collections you want to point to
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
