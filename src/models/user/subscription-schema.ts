import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISubscription extends Document {
  //Stripe-related

  stripeCustomerId: string;
  stripeSubscriptionId: string;
  paymentMethodId: string;

  //Stripe-related

  userId: Types.ObjectId;
  subscriptionId: string;
  orderId: string;
  linkedPurchaseToken: string;
  deviceType: string;
  planId: Types.ObjectId | string;
  status: string;
  trialStart: Date | null;
  trialEnd: Date | null;
  startDate: Date;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingDate: Date | null;
  amount: number;
  currency: string;
  nextPlanId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    //Stripe Related Keys

    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    paymentMethodId: { type: String },

    //Stripe Related Keys

    userId: { type: Schema.Types.ObjectId, ref: "user" },
    linkedPurchaseToken: { type: String },
    orderId: { type: String },
    deviceType: { type: String},
    subscriptionId: { type: String },
    planId: { type: Schema.Types.ObjectId, ref: "plan", required: true },
    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "canceled",
        "canceling",
        "incomplete",
        "past_due",
      ],
      required: true,
    }, // trialing, active, canceled, etc.
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    startDate: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    nextBillingDate: { type: Date, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    nextPlanId: { type: Schema.Types.ObjectId, ref: "plan", default: null },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const SubscriptionModel = mongoose.model<ISubscription>(
  "subscription",
  subscriptionSchema
);
