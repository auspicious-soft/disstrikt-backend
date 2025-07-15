import { Schema, Document, model, Types } from "mongoose";

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  invoiceId: string;
  paymentIntentId?: string;
  status: "succeeded" | "failed";
  amount: number;
  currency: string;
  paymentMethodDetails: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    type: string;
  };
  billingReason: string;
  errorMessage?: string;
  paidAt: Date;
  metadata?: Record<string, any>;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true },
    invoiceId: { type: String, required: true },
    paymentIntentId: { type: String },
    status: {
      type: String,
      enum: ["succeeded", "failed"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    paymentMethodDetails: {
      brand: { type: String, required: true },
      last4: { type: String, required: true },
      expMonth: { type: Number, required: true },
      expYear: { type: Number, required: true },
      type: { type: String, required: true }, // e.g. "card"
    },
    billingReason: { type: String, required: true }, // e.g. "subscription_create", "subscription_cycle"
    errorMessage: { type: String, default: null },
    paidAt: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed }, // optional custom info
  },
  { timestamps: true }
);

export const TransactionModel = model<ITransaction>(
  "transaction",
  transactionSchema
);
