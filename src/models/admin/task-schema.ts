import mongoose, { Schema, Document } from "mongoose";
import { bool } from "prop-types";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

interface JobData {
  title?: string;
  description?: string;
  subject?: string;
}

export interface IJOb extends Document {
  en?: JobData;
  nl?: JobData;
  fr?: JobData;
  es?: JobData;
  appReview?: boolean;
  taskType?: string;
  answerType?: string;
  link?: string;
  count?: number;
  milestone?: number;
  isActive?: boolean;
}

const JobSchema = new Schema<IJOb>({
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
    enum: ["DOWNLOAD", "UPLOAD", "TEXT", "QUIZ", "CHECKBOX", "DONE"],
  },

  link: {
    type: String,
    default: "",
  },
  count: {
    type: Number,
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

export const JobModel = mongoose.model<IJOb>("job", JobSchema);
