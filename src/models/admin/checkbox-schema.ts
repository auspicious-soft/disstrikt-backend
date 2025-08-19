import mongoose, { Schema, Document } from "mongoose";
import { bool } from "prop-types";
import { countries } from "src/utils/constant";

// "en", "nl", "fr", "es"

export interface ICheckbox extends Document {
  taskId: mongoose.Types.ObjectId;
  en?: any;
  nl?: any;
  fr?: any;
  es?: any;
  isActive?: boolean;
}

const CheckboxSchema = new Schema<ICheckbox>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "task",
    required: true,
  },
  en: {
    type: Object,
    default: {}
  },
  nl: {
    type: Object,
    default: {}
  },
  fr: {
    type: Object,
    default: {}
  },
  es: {
    type: Object,
    default: {}
  },

  isActive: {
    type: Boolean,
    default: true,
  },
});

export const CheckboxModel = mongoose.model<ICheckbox>("checkbox", CheckboxSchema);
