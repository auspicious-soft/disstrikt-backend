import mongoose, { Document, Schema } from "mongoose";
import { genders } from "src/utils/constant";

export interface IUserInfo extends Document {
  userId: mongoose.Types.ObjectId;
  aboutMe?: string;
  setCards: string[];
  links: {
    platform: string; // e.g., Instagram, TikTok, etc.
    url: string;
  }[];
  measurements: {
    heightCm?: number;
    bustCm?: number;
    waistCm?: number;
    hipsCm?: number;
    weightKg?: number;
    shoeSizeUK?: number;
  };
  portfolioImages: string[];
  videos: {
    title: "introVideo" | "catwalkVideo" | "other" | string;
    url: string;
  }[];
  dob?: Date;
  gender?: "male" | "female" | "other";
  notificationSettings: {
    jobAlerts: boolean;
    tasksPortfolioProgress: boolean;
    profilePerformance: boolean;
    engagementMotivation: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUserInfo>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    measurements: {
      type: new Schema(
        {
          heightCm: Number,
          bustCm: Number,
          waistCm: Number,
          hipsCm: Number,
          weightKg: Number,
          shoeSizeUK: Number,
        },
        { _id: false }
      ),
      default: {},
    },
    videos: [
      {
        title: {
          type: String,
          enum: ["introVideo", "catwalkVideo", "other"],
          default: "other",
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    portfolioImages: {
      type: [String],
      default: [],
    },
    aboutMe: {
      type: String,
      default: "",
    },
    setCards: {
      type: [String], // URLs
      default: [],
    },
    links: [
      {
        platform: {
          type: String, // e.g., "Instagram", "Website", etc.
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    dob: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: genders,
      default: null,
    },

    notificationSettings: {
      jobAlerts: {
        type: Boolean,
        default: true,
      },
      tasksPortfolioProgress: {
        type: Boolean,
        default: true,
      },
      profilePerformance: {
        type: Boolean,
        default: true,
      },
      engagementMotivation: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

// Virtual: calculate age from DOB
userSchema.virtual("age").get(function (this: IUserInfo) {
  if (!this.dob) return null;
  const ageDifMs = Date.now() - this.dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Ensure virtuals show up in toJSON and toObject
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const UserInfoModel = mongoose.model<IUserInfo>("userInfo", userSchema);
