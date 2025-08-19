import mongoose, { Document, Schema } from "mongoose";
import { authTypes, countries, genders, languages } from "src/utils/constant";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  image?: string;
  country?: "NL" | "BE" | "FR" | "UK" | "ES";
  language?: "en" | "nl" | "fr" | "es";
  fcmToken?: string | null;
  authType: "EMAIL" | "GOOGLE" | "APPLE";
  countryCode?: string;
  phone?: string;
  isVerifiedEmail: boolean;
  isVerifiedPhone: boolean;
  isUserInfoComplete: boolean;
  isDeleted: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdForVerificationAt?: Date;
  stripeCustomerId?: string;
  isCardSetupComplete?: boolean;
  hasUsedTrial?: boolean;
  currentMilestone?: number;
}

const userSchema = new Schema<IUser>(
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
      default: "admin/images/cb4d721c-695a-4725-8369-eff28b5a967b.png",
    },
    country: {
      type: String,
      enum: countries,
      default: "UK",
    },
    fcmToken: {
      type: String,
      default: null,
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
    countryCode: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isVerifiedEmail: {
      type: Boolean,
      default: false,
    },
    isVerifiedPhone: {
      type: Boolean,
      default: false,
    },
    isUserInfoComplete: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },

    createdForVerificationAt: {
      type: Date,
      default: function (this: IUser) {
        return !this.isVerifiedEmail ? new Date() : undefined;
      },
      index: {
        expireAfterSeconds: 600,
        partialFilterExpression: { isVerifiedEmail: false },
      },
    },

    stripeCustomerId: {
      type: String,
      default: null,
    },

    isCardSetupComplete: {
      type: Boolean,
      default: false,
    },

    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
    currentMilestone: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("user", userSchema);
