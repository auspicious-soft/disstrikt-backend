import { Schema, Document, model, Types } from "mongoose";

export interface ITransaction extends Document {
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
