// src/models/notification.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type:
    | "TASK_COMPLETED"
    | "TASK_REJECTED"
    | "JOB_SHORTLISTED"
    | "JOB_REJECTED"
    | "JOB_ALERT"
    | "MILESTONE_UNLOCKED"
    | "SUBSCRIPTION_STARTED"
    | "SUBSCRIPTION_RENEWED"
    | "SUBSCRIPTION_FAILED"
    | "SUBSCRIPTION_CANCELLED"
    | "PORTFOLIO_BOOTCAMP_CANCELLED"
    | "SKILL_BOOTCAMP_CANCELLED"
    | "SHOOT_CANCELLED"
    | "PORTFOLIO_BOOTCAMP_REVIEWED"
    | "SKILL_BOOTCAMP_REVIEWED"
    | "SHOOT_REVIEWED"
  title: string;
  description: string;
  language: "en" | "nl" | "fr" | "es";
  metadata?: Record<string, any>;
  referenceId?: {
    jobId?: Types.ObjectId;
    taskId?: Types.ObjectId;
    subscriptionId?: Types.ObjectId;
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    type: {
      type: String,
      enum: [
        "TASK_COMPLETED",
        "TASK_REJECTED",
        "JOB_SHORTLISTED",
        "JOB_REJECTED",
        "JOB_ALERT",
        "MILESTONE_UNLOCKED",
        "FREETRIAL_STARTED",
        "SUBSCRIPTION_STARTED",
        "SUBSCRIPTION_RENEWED",
        "SUBSCRIPTION_FAILED",
        "SUBSCRIPTION_CANCELLED",
        "PORTFOLIO_BOOTCAMP_CANCELLED",
        "SKILL_BOOTCAMP_CANCELLED",
        "SHOOT_CANCELLED",
        "PORTFOLIO_BOOTCAMP_REVIEWED",
        "SKILL_BOOTCAMP_REVIEWED",
        "SHOOT_REVIEWED",
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    language: { type: String, enum: ["en", "nl", "fr", "es"], default: "en" },
    metadata: { type: Schema.Types.Mixed },
    referenceId: {
      jobId: { type: Schema.Types.ObjectId, ref: "job" },
      taskId: { type: Schema.Types.ObjectId, ref: "task" },
      subscriptionId: { type: Schema.Types.ObjectId, ref: "subscription" },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const NotificationModel = mongoose.model<INotification>(
  "notification",
  notificationSchema
);
