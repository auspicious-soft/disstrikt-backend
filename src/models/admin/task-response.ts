import mongoose, { Schema, Document } from "mongoose";

// "en", "nl", "fr", "es"

interface TaskData {
  title?: string;
  description?: string;
  subject?: string;
}

export interface ITaskResponse extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  uploadLinks?: string[];
  text?: string;
  quiz?: object[];
  input?: object;
  checkBox?: string[];
  taskNumber?: number;
  milestone?: number;
  taskReviewed?: boolean;
  rating?: number;
  appReview?: boolean;
  isActive?: boolean;
}

const TaskResponseSchema = new Schema<ITaskResponse>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "task",
    required: true,
  },
  uploadLinks: {
    type: Array,
    default: [],
  },
  text: {
    type: String,
    default: "",
  },
  quiz: {
    type: Array,
    default: [],
  },
  input: {
    type: Object,
    default: {},
  },
  checkBox: {
    type: Object,
    default: [],
  },
  taskReviewed: {
    type: Boolean,
    default: false,
  },
  rating: {
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
  appReview: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const TaskResponseModel = mongoose.model<ITaskResponse>(
  "taskresponse",
  TaskResponseSchema
);
