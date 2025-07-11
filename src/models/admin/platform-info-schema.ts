import mongoose, { Document, Schema } from "mongoose";
import { authTypes, countries, languages } from "src/utils/constant";

interface TranslatedText {
  en?: string;
  nl?: string;
  fr?: string;
  es?: string;
}
export interface IPlatformInfo extends Document {
  termAndCondition?: TranslatedText;
  privacyPolicy?: TranslatedText;
  support?: {
    phone: string;
    email: string;
    address: TranslatedText;
  };
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const platformInfoSchema = new Schema<IPlatformInfo>(
  {
    termAndCondition: {
      type: Object,
      default: {
        en: "",
        nl: "",
        fr: "",
        es: "",
      },
    },
    privacyPolicy: {
      type: Object,
      default: {
        en: "",
        nl: "",
        fr: "",
        es: "",
      },
    },
    support: {
      type: Object,
      default: {
        phone: "",
        email: "",
        address: {
          en: "",
          nl: "",
          fr: "",
          es: "",
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const PlatformInfoModel = mongoose.model<IPlatformInfo>(
  "platforminfo",
  platformInfoSchema
);
