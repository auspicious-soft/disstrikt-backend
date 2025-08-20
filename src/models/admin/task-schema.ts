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
  link?: string[];
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
      "JOB_APPLY",
      "PROFILE_PIC",
      "PORT_IMAGE",
      "PORT_BIO",
      "LINK",
      "TEXT",
      "WATCH_VIDEO",
      "DOWNLOAD_FILE",
      "JOB_SELECTED",
      "CHECK_BOX",
      "UPLOAD",
      "QUIZ",
      "SET_CARD",
      "PORT_INTRO_VIDEO",
    ],
    default: "DONE",
  },
  answerType: {
    type: String,
    enum: [
      "QUIZ",
      "CHECK_BOX",
      "DONE",
      "WRITE_SECTION",
      "CALENDLY",
      "UPLOAD_IMAGE",
      "UPLOAD_VIDEO",
      "UPLOAD_FILE",

      "INPUT", // Not used anywhere
    ],
  },

  link: {
    type: Array,
    default: [],
  },
  count: {
    type: Number,
    default: 0,
  },
  taskNumber: {
    type: Number,
    autoIncrement: true,
    default: 0,
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
