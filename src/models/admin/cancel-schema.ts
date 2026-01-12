import mongoose, { Schema, Document } from "mongoose";

export interface ICancelBooking2 extends Document {
  studioId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  date: Date;
  time: Date;
  startTime: string;
  endtime: string;
  slot: string;
  cancelledBy: "USER" | "ADMIN";
  status: "Cancelled";
  activityType?: "Portfolio Bootcamp" | "Skill Bootcamp" | "Create a Shoot";
  comments: string | null;
  createdAt: Date;
}

const CancelBooking2Schema = new Schema<ICancelBooking2>(
  {
    studioId: {
      type: Schema.Types.ObjectId,
      ref: "studio",
      required: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: "studiobooking",
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
    cancelledBy: {
      type: String,
      default: "ADMIN",
    },
    status: {
      type: String,
      default: "Cancelled",
    },
    comments: {
      type: String,
      default: null,
    },
    activityType: {
      type: String,
      enum: ["Portfolio Bootcamp", "Skill Bootcamp", "Create a Shoot", null],
      default: "",
    },
  },
  { timestamps: true }
);

export const CancelBooking2Model = mongoose.model<ICancelBooking2>(
  "cancelBooking2",
  CancelBooking2Schema
);
