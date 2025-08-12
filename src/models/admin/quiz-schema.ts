import mongoose, { Schema, Document } from "mongoose";
import { bool } from "prop-types";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

interface TaskData {
  question?: string;
  option_A?: string;
}

export interface ITask extends Document {
  taskId: mongoose.Types.ObjectId;
  en?: TaskData;
  nl?: TaskData;
  fr?: TaskData;
  es?: TaskData;
  answer?: string;
  isActive?: boolean;
}

const TaskSchema = new Schema<ITask>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "task",
    required: true,
  },
  en: {
    question: { type: String, default: "" },
    option_A: { type: String, default: "" },
    option_B: { type: String, default: "" },
    option_C: { type: String, default: "" },
    option_D: { type: String, default: "" },
  },
  nl: {
    question: { type: String, default: "" },
    option_A: { type: String, default: "" },
    option_B: { type: String, default: "" },
    option_C: { type: String, default: "" },
    option_D: { type: String, default: "" },
  },
  fr: {
    question: { type: String, default: "" },
    option_A: { type: String, default: "" },
    option_B: { type: String, default: "" },
    option_C: { type: String, default: "" },
    option_D: { type: String, default: "" },
  },
  es: {
    question: { type: String, default: "" },
    option_A: { type: String, default: "" },
    option_B: { type: String, default: "" },
    option_C: { type: String, default: "" },
    option_D: { type: String, default: "" },
  },

  answer: {
    type: String,
    enum: ["option_A", "option_B", "option_C", "option_D"],
    required: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
});

export const TaskModel = mongoose.model<ITask>("task", TaskSchema);
