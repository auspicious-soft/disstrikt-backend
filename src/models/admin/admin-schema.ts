import mongoose, { Document, Schema } from "mongoose";
import { authTypes, countries, languages } from "src/utils/constant";

export interface IAdmin extends Document {
  fullName: string;
  email: string;
  password?: string;
  image?: string;
  country?: "NL" | "BE" | "FR" | "UK" | "ES";
  language?: "en" | "nl" | "fr" | "es";
  authType: "EMAIL" | "GOOGLE" | "APPLE";
  createdAt?: Date;
  updatedAt?: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authType === "EMAIL";
      },
    },
    image: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      enum: countries,
      default: "UK",
    },
    language: {
      type: String,
      enum: languages,
      default: "en",
    },
    authType: {
      type: String,
      enum: authTypes,
      default: "EMAIL",
    },
  },
  { timestamps: true }
);

export const AdminModel = mongoose.model<IAdmin>("admin", adminSchema);
