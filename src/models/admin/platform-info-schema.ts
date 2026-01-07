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
  shootPolicy?: TranslatedText;
  shootGoals?: string[];
  shootFormat?: string[];
  vibes?: string[];
  addOnFeatures?: [
    {
      key: string;
      value: number;
    }
  ];
  canBringOutfits: number;
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
        phone: {
          UK: "",
          BE: "",
          FR: "",
          ES: "",
          NL: "",
        },
        email: {
          UK: "",
          BE: "",
          FR: "",
          ES: "",
          NL: "",
        },
        address: {
          en: "",
          nl: "",
          fr: "",
          es: "",
        },
      },
    },
    shootPolicy: {
      type: Object,
      default: {
        en: "",
        nl: "",
        fr: "",
        es: "",
      },
    },
    shootGoals: {
      type: [String],
      default: [],
    },
    shootFormat: {
      type: [String],
      default: [],
    },
    vibes: {
      type: [String],
      default: [],
    },
    addOnFeatures: {
      type: [Object],
      default: [],
    },
    canBringOutfits: {
      type: Number,
      default: 0,
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
