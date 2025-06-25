import mongoose, { Schema, Document } from "mongoose";

// "en", "nl", "fr", "es"

interface TranslatedText {
  en?: string;
  nl?: string;
  fr?: string;
  es?: string;
}

interface BenefitObject {
  tasks: number;
  pictureUploadLimit: number;
  videoUploadLimit: number;
  jobApplicationsPerDay?: number;
  jobApplicationsPerMonth?: number;
  generalContact?: boolean;
  websitePublication?: boolean;
  profilePromotion?: boolean;
  modelCoach?: boolean;
  modelTrip?: boolean;
  unlimitedShoots?: boolean;
  regionalAccess?: any;
  modelRouteProgram?: boolean;
}

const BenefitObjectSchema = {
  tasks: { type: Number, default: 0 },
  pictureUploadLimit: { type: Number, default: 0 },
  videoUploadLimit: { type: Number, default: 0 },
  jobApplicationsPerDay: { type: Number, default: 0 },
  jobApplicationsPerMonth: { type: Number, default: 0 },
  generalContact: { type: Boolean, default: false },
  websitePublication: { type: Boolean, default: false },
  profilePromotion: { type: Boolean, default: false },
  modelCoach: { type: Boolean, default: false },
  modelTrip: { type: Boolean, default: false },
  unlimitedShoots: { type: Boolean, default: false },
  regionalAccess: { type: Array, default: [] },
  modelRouteProgram: { type: Boolean, default: false },
};

export interface IPlan extends Document {
  key: string; // e.g., 'basic', 'pro', 'premium'
  name: TranslatedText;
  description: TranslatedText;
  features: TranslatedText[];
  trialDays: number;
  stripeProductId: string;
  stripePrices: {
    eur: string;
    gbp: string;
  };
  unitAmounts: {
    eur: number;
    gbp: number;
  };

  fullAccess: BenefitObject;
  trialAccess: BenefitObject;
  isActive: boolean
}

const PlanSchema = new Schema<IPlan>({
  key: { type: String, required: true, unique: true },
  name: { type: Object, required: true },
  description: { type: Object, required: true },
  features: [
    {
      en: { type: String },
      nl: { type: String },
      fr: { type: String },
      es: { type: String },
    },
  ],
  trialDays: { type: Number, default: 14 },
  stripeProductId: { type: String, required: true },
  stripePrices: {
    eur: { type: String, required: true },
    gbp: { type: String, required: true },
  },
  unitAmounts: {
    eur: { type: Number, required: true },
    gbp: { type: Number, required: true },
  },

  fullAccess: { type: BenefitObjectSchema, default: {} },
  trialAccess: { type: BenefitObjectSchema, default: {} },
  isActive: {
    type: Boolean,
    default: true
  }
});

export const planModel = mongoose.model<IPlan>("plan", PlanSchema);
