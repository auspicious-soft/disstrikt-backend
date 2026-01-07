import mongoose, { Schema, Document } from "mongoose";

export interface IStudios extends Document {
  name: string;
  location: string;
  city: string;
  country: string;
  createdAt: Date;
  isDeleted: Boolean;
}

const StudioSchema = new Schema<IStudios>(
  {
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);



export const StudioModel = mongoose.model<IStudios>("studio", StudioSchema);
