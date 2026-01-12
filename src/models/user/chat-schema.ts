import mongoose, { Document } from "mongoose";

export interface ChatDocument extends Document {
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  botUsed: "Camille" | "Harper" | "Lumi";
  modelUsed: string;
  imageUrl: string;
  content: string;
  createdAt: Date;
}

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    botUsed: {
      type: String,
      enum: ["Camille", "Harper", "Lumi"],
      required: true,
    },
    modelUsed: {
      type: String,
      required: true,
      default: "GPT-5-mini",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const chatModel = mongoose.model<ChatDocument>("chat", chatSchema);
