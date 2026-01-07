import mongoose, { Schema, Document } from "mongoose";

export interface IStudiosBooking extends Document {
  studioId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  time: Date;
  startTime: string;
  endtime: string;
  slot: string;
  status: "Booked" | "Cancelled" | "Empty";
  attended: "Yes" | "No" | null;
  rating: number;
  comments: string | null;
  images: string[];
  activityType?: "Portfolio Bootcamp" | "Skill Bootcamp" | "Create a Shoot";
  addOnFeatures?: object[];
  shootFormat?: string;
  shootGoals?: string;
  vibes?: string;
  canBringOutfits?: string;
  createdAt: Date;
}

const StudioBookingSchema = new Schema<IStudiosBooking>(
  {
    studioId: {
      type: Schema.Types.ObjectId,
      ref: "studio",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endtime: {
      type: String,
      required: true,
    },
    time: {
      type: Date,
    },
    slot: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Booked", "Cancelled", "Empty"],
      default: "Empty",
    },
    attended: {
      type: String,
      enum: ["Yes", "No"],
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
    },
    comments: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    activityType: {
      type: String,
      enum: ["Portfolio Bootcamp", "Skill Bootcamp", "Create a Shoot"],
      default: [],
    },
    addOnFeatures: {
      type: [Object],
      default: [],
    },
    shootFormat: {
      type: String,
      default: [],
    },
    shootGoals: {
      type: String,
      default: [],
    },
    vibes: {
      type: String,
      default: [],
    },
    canBringOutfits: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

StudioBookingSchema.index(
  { studioId: 1, date: 1, startTime: 1 },
  { unique: true }
);

export const StudioBookingModel = mongoose.model<IStudiosBooking>(
  "studiobooking",
  StudioBookingSchema
);
