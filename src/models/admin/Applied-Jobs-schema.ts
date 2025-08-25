import mongoose, { Schema, Document } from "mongoose";

export interface IAppliedJobs extends Document {
  userId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  status: "PENDING" | "REJECTED" | "SELECTED";
  createdAt: Date;
}

const AppliedJobSchema = new Schema<IAppliedJobs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "job",
      required: true,
    },
    status: {
      type: String,
      default: "PENDING",
      required: true,
    },
  },
  { timestamps: true }
);

export const AppliedJobModel = mongoose.model<IAppliedJobs>(
  "appliedJobs",
  AppliedJobSchema
);
