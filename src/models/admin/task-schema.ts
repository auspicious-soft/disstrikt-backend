import mongoose, { Schema, Document } from "mongoose";
import { bool } from "prop-types";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

interface TaskData {
  title?: string;
  description?: string;
  subject?: string;
}

export interface ITask extends Document {
  en?: TaskData;
  nl?: TaskData;
  fr?: TaskData;
  es?: TaskData;
  appReview?: boolean;
  taskType?: string;
  answerType?: string;
  link?: string;
  count?: number;
  milestone?: number;
  taskNumber?: number;
  isActive?: boolean;
}

const TaskSchema = new Schema<ITask>({
  en: {
    title: { type: String, default: "" },
    subject: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  nl: {
    title: { type: String, default: "" },
    subject: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  fr: {
    title: { type: String, default: "" },
    subject: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  es: {
    title: { type: String, default: "" },
    subject: { type: String, default: "" },
    description: { type: String, default: "" },
  },

  appReview: {
    type: Boolean,
    default: false,
  },

  taskType: {
    type: String,
    enum: [
      "PROFILE-PIC",
      "JOB-APPLY",
      "PORT-BIO",
      "QUIZ",
      "PORT-IMAGE",
      "CALENDLY",
      "JOB-SELECTED",
      "PORT-UPDATE",
      "PORT-INTRO-VIDEO",
      "UPLOAD",
      "PORT-MEDIAKIT",
      "PORT-YOUTUBE",
      "CHECK-BOX",
      "LEARN",
      "DONE",
      "WRITE-SECTION",
    ],
    default: "DONE",
  },
  answerType: {
    type: String,
    enum: [
      "DOWNLOAD-FILE",
      "VIEW-IMAGE",
      "VIEW-VIDEO",
      "VIEW-AUDIO",
      "UPLOAD-IMAGE",
      "UPLOAD-FILE",
      "UPLOAD-VIDEO",
      "UPLOAD-AUDIO",
      "TEXT",
      "QUIZ",
      "CHECKBOX",
      "DONE",
    ],
  },

  link: {
    type: String,
    default: "",
  },
  count: {
    type: Number,
    default: 0,
  },
  taskNumber: {
    type: Number,
    autoIncrement: true,
    default: 1,
  },
  milestone: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const TaskModel = mongoose.model<ITask>("task", TaskSchema);
