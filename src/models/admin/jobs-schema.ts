import mongoose, { Schema, Document } from "mongoose";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

interface JobData {
  title?: string;
  branch?: string;
  description?: string;
  companyName?: string;
  location?: string;
  city?: string;
  country?: string;
  gender?: string;
}

export interface IJOb extends Document {
  en?: JobData;
  nl?: JobData;
  fr?: JobData;
  es?: JobData;
  minAge?: number;
  maxAge?: number;
  date?: Date;
  time?: number;
  pay?: number;
  currency?: "eur" | "gbp";
  countryCode?: string;
  appliedUsers?: mongoose.Types.ObjectId[];
  isActive?: boolean;
}

const JobSchema = new Schema<IJOb>({
  en: {
    title: { type: String, default: "" },
    branch: { type: String, default: "" },
    description: { type: String, default: "" },
    companyName: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    gender: { type: String, default: "" },
  },
  nl: {
    title: { type: String, default: "" },
    branch: { type: String, default: "" },
    description: { type: String, default: "" },
    companyName: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    gender: { type: String, default: "" },
  },
  fr: {
    title: { type: String, default: "" },
    branch: { type: String, default: "" },
    description: { type: String, default: "" },
    companyName: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    gender: { type: String, default: "" },
  },
  es: {
    title: { type: String, default: "" },
    branch: { type: String, default: "" },
    description: { type: String, default: "" },
    companyName: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    gender: { type: String, default: "" },
  },
  minAge: { type: Number, requird: true },
  maxAge: { type: Number, requird: true },
  date: { type: Date, required: true, index: true },
  time: { type: Number, requird: true },
  pay: { type: Number, requird: true },
  currency: { type: String, enum: ["eur", "gbp"] },
  countryCode: { type: String, enum: countries },
  appliedUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const JobModel = mongoose.model<IJOb>("job", JobSchema);
