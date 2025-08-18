import mongoose, { Schema, Document } from "mongoose";
import { bool } from "prop-types";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

interface QuizData {
  question?: string;
  option_A?: string;
}

export interface IQuiz extends Document {
  taskId: mongoose.Types.ObjectId;
  en?: QuizData;
  nl?: QuizData;
  fr?: QuizData;
  es?: QuizData;
  questionNumber?: number;
  answer?: string;
  isActive?: boolean;
}

const QuizSchema = new Schema<IQuiz>({
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

  questionNumber: {
    type: Number,
    default: 0,
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

export const QuizModel = mongoose.model<IQuiz>("quiz", QuizSchema);
