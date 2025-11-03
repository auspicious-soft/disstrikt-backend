import { Schema, Document, model, Types } from "mongoose";

export interface ITransaction extends Document {
  //stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  invoiceId: string;
  billingReason: string;
  errorMessage?: string;
  paymentMethodDetails: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    type: string;
  };
  metadata?: Record<string, any>;
  //stripe

  userId: Types.ObjectId;
  planId: Types.ObjectId | string;
  paymentIntentId?: string;
  orderId: string;
  status: "succeeded" | "failed" | "pending";
  amount: number;
  currency: string;
  paidAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    //stripe
    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true },
    invoiceId: { type: String, required: true },
    paymentMethodDetails: {
      brand: { type: String, required: true },
      last4: { type: String, required: true },
      expMonth: { type: Number, required: true },
      expYear: { type: Number, required: true },
      type: { type: String, required: true }, // e.g. "card"
    },
    billingReason: { type: String, required: true }, // e.g. "subscription_create", "subscription_cycle"
    errorMessage: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed }, // optional custom info
    //stripe

    userId: { type: Schema.Types.ObjectId, ref: "user" },
    planId: { type: Schema.Types.ObjectId, ref: "plan", required: true },
    status: {
      type: String,
      enum: ["succeeded", "failed", "pending"],
      required: true,
    },
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ orderId: 1, userId: 1 }, { unique: true });

export const TransactionModel = model<ITransaction>(
  "transaction",
  transactionSchema
);
