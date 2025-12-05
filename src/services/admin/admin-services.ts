import { Request, Response } from "express";
import mongoose, { ObjectId, Types } from "mongoose";
import { deleteFileFromS3 } from "src/config/s3";
import stripe from "src/config/stripe";
import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";
import { CheckboxModel } from "src/models/admin/checkbox-schema";
import { JobModel } from "src/models/admin/jobs-schema";
import { planModel } from "src/models/admin/plan-schema";
import { QuizModel } from "src/models/admin/quiz-schema";
import { TaskModel } from "src/models/admin/task-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { TokenModel } from "src/models/user/token-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserModel } from "src/models/user/user-schema";
import { features, languages, regionalAccess } from "src/utils/constant";
import {
  convertToUTC,
  decodeSignedPayload,
  translateJobFields,
} from "src/utils/helper";
import { Stripe } from "stripe";
import { Parser } from "json2csv";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { TaskResponseModel } from "src/models/admin/task-response";
import { NotificationService } from "src/utils/FCM/fcm";
import { google } from "googleapis";
import jwt, { JwtPayload } from "jsonwebtoken";
import { userMoreInfo } from "src/controllers/auth/auth-controller";
import * as crypto from "crypto"; // Signature verify ke liye
import {
  AppStoreServerAPIClient,
  Environment,
  SendTestNotificationResponse,
} from "@apple/app-store-server-library";
import axios from "axios";
import { testPlanModel } from "src/models/admin/test-plan-schema";
import { readFile, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

export async function convertToGBP(
  amount: number,
  fromCurrency: string
): Promise<number> {
  try {
    if (fromCurrency === "GBP") return amount;

    const { data } = await axios.get(
      `https://api.exchangerate.host/convert?from=${fromCurrency}&to=GBP&amount=${amount}`
    );

    if (data?.result) return data.result;
    else return amount; // fallback (no conversion)
  } catch (err) {
    console.error("Currency conversion failed:", err);
    return amount; // fallback to original
  }
}

export const planServices = {
  async getPlans(payload: any) {
    const plans =
      process.env.PAYMENT === "DEV"
        ? await testPlanModel.find()
        : await planModel.find();
    return { plans, features, regionalAccess };
  },

  async createPlan(payload: any) {
    const {
      key,
      name,
      description,
      trialDays,
      eurAmount,
      gbpAmount,
      fullAccess,
      trialAccess,
      features,
    } = payload;

    const stripeProduct = await stripe.products.create({
      name: name.en,
      description: description.en,
      metadata: {
        key,
      },
    });

    // 2. Create Stripe Prices
    const eurPrice = await stripe.prices.create({
      unit_amount: Math.round(eurAmount * 100), // Stripe needs amount in cents
      currency: "eur",
      recurring: { interval: "month" },
      product: stripeProduct.id,
    });

    const gbpPrice = await stripe.prices.create({
      unit_amount: Math.round(gbpAmount * 100),
      currency: "gbp",
      recurring: { interval: "month" },
      product: stripeProduct.id,
    });

    const taskFeature =
      fullAccess.tasks < 200
        ? {
            en: `${fullAccess.tasks} Tasks`,
            nl: `${fullAccess.tasks} Taken`,
            fr: `${fullAccess.tasks} Tâches`,
            es: `${fullAccess.tasks} Tareas`,
          }
        : {
            en: `${fullAccess.tasks}+ Tasks`,
            nl: `${fullAccess.tasks}+ Taken`,
            fr: `${fullAccess.tasks}+ Tâches`,
            es: `${fullAccess.tasks}+ Tareas`,
          };
    const jobApplicationFeature =
      fullAccess.jobApplicationsPerDay < 100
        ? {
            en: `${fullAccess.jobApplicationsPerDay} Job Application / Day (max ${fullAccess.jobApplicationsPerMonth}/month)`,
            nl: `${fullAccess.jobApplicationsPerDay} Sollicitatie / Dag (max ${fullAccess.jobApplicationsPerMonth}/maand)`,
            fr: `${fullAccess.jobApplicationsPerDay} Candidature / Jour (max ${fullAccess.jobApplicationsPerMonth}/mois)`,
            es: `${fullAccess.jobApplicationsPerDay} Solicitud / Día (máx ${fullAccess.jobApplicationsPerMonth}/mes)`,
          }
        : {
            en: "Unlimited Job Applications",
            nl: "Onbeperkt Sollicitaties",
            fr: "Candidatures Illimitées",
            es: "Solicitudes Ilimitadas",
          };

    // 3. Save to DB
    const planDoc = await planModel.create({
      key,
      name,
      description,
      trialDays,
      stripeProductId: stripeProduct.id,
      stripePrices: {
        eur: eurPrice.id,
        gbp: gbpPrice.id,
      },
      unitAmounts: {
        eur: Math.round(eurAmount * 100),
        gbp: Math.round(gbpAmount * 100),
      },
      fullAccess,
      trialAccess,
      features: [...features, taskFeature, jobApplicationFeature],
    });

    return planDoc;
  },

  async updatePlan(planId: string, payload: any) {
    const {
      name,
      description,
      trialDays,
      unitAmounts = {},
      fullAccess,
      trialAccess,
      isActive,
    } = payload;

    const { eur: eurAmount, gbp: gbpAmount } = unitAmounts;

    const plan =
      process.env.PAYMENT === "DEV"
        ? await testPlanModel.findById(planId)
        : await planModel.findById(planId);
    if (!plan) throw new Error("planNotFound");

    // Update Stripe product name and description
    if (description) {
      await stripe.products.update(plan.stripeProductId, {
        description: description.en,
      });
    }
    if (name) {
      await stripe.products.update(plan.stripeProductId, {
        name: name.en,
      });
    }

    let eurPrice;

    if (eurAmount) {
      if (plan.stripePrices.eur) {
        await stripe.prices.update(plan.stripePrices.eur, { active: false });
      }
      // Update Stripe prices (deactivating old and creating new)
      eurPrice = await stripe.prices.create({
        unit_amount: Math.round(eurAmount * 100),
        currency: "eur",
        recurring: { interval: "month" },
        product: plan.stripeProductId,
      });
    }

    let gbpPrice;

    if (gbpAmount) {
      if (plan.stripePrices.gbp) {
        await stripe.prices.update(plan.stripePrices.gbp, { active: false });
      }
      gbpPrice = await stripe.prices.create({
        unit_amount: Math.round(gbpAmount * 100),
        currency: "gbp",
        recurring: { interval: "month" },
        product: plan.stripeProductId,
      });
    }

    let taskFeature;
    let jobApplicationFeature;
    // Construct feature updates based on fullAccess values
    if (fullAccess) {
      if (fullAccess.task) {
        taskFeature =
          fullAccess.tasks < 200
            ? {
                en: `${fullAccess.tasks} Tasks`,
                nl: `${fullAccess.tasks} Taken`,
                fr: `${fullAccess.tasks} Tâches`,
                es: `${fullAccess.tasks} Tareas`,
              }
            : {
                en: `${fullAccess.tasks}+ Tasks`,
                nl: `${fullAccess.tasks}+ Taken`,
                fr: `${fullAccess.tasks}+ Tâches`,
                es: `${fullAccess.tasks}+ Tareas`,
              };
      }

      if (fullAccess.jobApplicationsPerDay) {
        jobApplicationFeature =
          fullAccess.jobApplicationsPerDay < 100
            ? {
                en: `${fullAccess.jobApplicationsPerDay} Job Application / Day (max ${fullAccess.jobApplicationsPerMonth}/month)`,
                nl: `${fullAccess.jobApplicationsPerDay} Sollicitatie / Dag (max ${fullAccess.jobApplicationsPerMonth}/maand)`,
                fr: `${fullAccess.jobApplicationsPerDay} Candidature / Jour (max ${fullAccess.jobApplicationsPerMonth}/mois)`,
                es: `${fullAccess.jobApplicationsPerDay} Solicitud / Día (máx ${fullAccess.jobApplicationsPerMonth}/mes)`,
              }
            : {
                en: "Unlimited Job Applications",
                nl: "Onbeperkt Sollicitaties",
                fr: "Candidatures Illimitées",
                es: "Solicitudes Ilimitadas",
              };
      }
    }

    // Update DB
    if (name) {
      plan.name = name;
    }
    if (description) {
      plan.description = description;
    }
    if (trialDays) {
      plan.trialDays = trialDays;
    }

    if (eurPrice) {
      plan.stripePrices.eur = eurPrice.id;
      plan.unitAmounts.eur = Math.round(eurAmount * 100);
    }
    if (gbpPrice) {
      plan.stripePrices.gbp = gbpPrice.id;
      plan.unitAmounts.gbp = Math.round(gbpAmount * 100);
    }

    if (trialAccess) {
      plan.trialAccess = trialAccess;
    }

    if (fullAccess) {
      plan.fullAccess = fullAccess;
    }

    if (typeof isActive === "boolean") {
      plan.isActive = isActive;
    }

    if (taskFeature || jobApplicationFeature) {
      const filteredFeatures = plan.features.filter(
        (f) =>
          !f?.en?.includes("Tasks") &&
          !f?.en?.includes("Job Application") &&
          !f?.en?.includes("Unlimited Job Applications")
      );

      plan.features = [
        ...filteredFeatures,
        ...(taskFeature ? [taskFeature] : []),
        ...(jobApplicationFeature ? [jobApplicationFeature] : []),
      ];
    }

    await plan.save();
    return plan;
  },

  async handleStripeWebhook(req: Request) {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    if (!sig || !endpointSecret) {
      console.error("***STRIPE SIGNATURE MISSING***");
      return;
    }

    let event: Stripe.Event | undefined;
    const toDate = (timestamp?: number | null): Date | null =>
      typeof timestamp === "number" && !isNaN(timestamp)
        ? new Date(timestamp * 1000)
        : null;

    // Helper function to determine payment method type
    const getPaymentMethodType = async (paymentMethodId: string | null) => {
      if (!paymentMethodId) return null;
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentMethodId
        );
        return paymentMethod.type;
      } catch (error) {
        console.error("Error retrieving payment method:", error);
        return null;
      }
    };

    // Helper function to determine if subscription should be treated as active
    const shouldTreatAsActive = (
      subscription: Stripe.Subscription,
      paymentMethodType: string | null
    ) => {
      const isBacsOrSepa =
        paymentMethodType === "bacs_debit" ||
        paymentMethodType === "sepa_debit";

      // If it's past_due but uses BACS/SEPA, treat as active (payment is just processing)
      if (subscription.status === "past_due" && isBacsOrSepa) {
        return true;
      }

      // If trial just ended but payment is pending for BACS/SEPA, treat as active
      if (
        subscription.status === "past_due" &&
        subscription.trial_end &&
        Math.abs(new Date().getTime() - subscription.trial_end * 1000) <
          86400000
      ) {
        // Within 24 hours
        return true;
      }

      return false;
    };

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log(`***STRIPE EVENT TYPE***: ${event.type}`);

      const subscription = event.data.object as Stripe.Subscription;

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const {
            id: stripeSubscriptionId,
            customer: stripeCustomerId,
            status,
            start_date,
            trial_start,
            trial_end,
            cancel_at_period_end,
            items,
          } = subscription;

          const item = items?.data?.[0];
          const planAmount = item?.price?.unit_amount ?? 0;
          const currency = item?.price?.currency ?? "inr";
          const current_period_start = subscription.current_period_start;
          const current_period_end = subscription.current_period_end;

          // 🔑 CRITICAL: Get payment method type
          const paymentMethodType = await getPaymentMethodType(
            subscription.default_payment_method as string
          );

          // 🔑 CRITICAL: Determine actual status based on payment method
          let adjustedStatus = status;
          if (shouldTreatAsActive(subscription, paymentMethodType)) {
            adjustedStatus = "active";
            console.log(
              `🔧 Adjusted ${status} to active for ${paymentMethodType} payment method`
            );
          }

          // 🔑 HANDLE UPDATE PLAN SCENARIOS
          const existingSubscription = await SubscriptionModel.findOne({
            stripeCustomerId,
            stripeSubscriptionId,
          });

          if (existingSubscription) {
            console.log("📋 Updating existing subscription...");

            // Check if this is a trial ending scenario
            const wasTrialing = existingSubscription.status === "trialing";
            const isTrialEnding = wasTrialing && status !== "trialing";

            if (isTrialEnding) {
              console.log("🔄 Detected trial ending");

              await UserModel.findByIdAndUpdate(existingSubscription.userId, {
                hasUsedTrial: true,
                isCardSetupComplete: true,
              });

              // For BACS/SEPA users ending trial, ensure they maintain access
              if (
                paymentMethodType === "bacs_debit" ||
                paymentMethodType === "sepa_debit"
              ) {
                adjustedStatus = "active";
                console.log(
                  "🔧 Maintaining access for BACS/SEPA user with ending trial"
                );
              }
            }
          }

          const updateData: any = {
            stripeCustomerId,
            stripeSubscriptionId,
            status: cancel_at_period_end ? "canceling" : adjustedStatus,
            startDate: toDate(start_date),
            trialStart: toDate(trial_start),
            trialEnd: toDate(trial_end),
            currentPeriodStart: toDate(current_period_start),
            currentPeriodEnd: toDate(current_period_end),
            nextBillingDate: toDate(current_period_end),
            amount: planAmount / 100,
            currency,
          };

          const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
            { stripeCustomerId, stripeSubscriptionId },
            { $set: updateData },
            { upsert: false, new: true }
          );

          // 🔑 SEND APPROPRIATE NOTIFICATIONS FOR UPDATE SCENARIOS
          if (updatedSubscription && existingSubscription) {
            const wasTrialing = existingSubscription.status === "trialing";
            const isNowActive = adjustedStatus === "active";
            const wasActive = existingSubscription.status === "active";

            await UserModel.findByIdAndUpdate(updatedSubscription.userId, {
              hasUsedTrial: true,
              isCardSetupComplete: true,
            });

            if (wasTrialing && isNowActive) {
              await NotificationService(
                [updatedSubscription.userId] as any,
                "SUBSCRIPTION_STARTED",
                updatedSubscription._id as ObjectId
              );
            } else if (
              cancel_at_period_end &&
              !existingSubscription.nextPlanId
            ) {
              await NotificationService(
                [updatedSubscription.userId] as any,
                "SUBSCRIPTION_CANCELLED",
                updatedSubscription._id as ObjectId
              );
            }
          }

          break;
        }

        case "customer.subscription.deleted": {
          const { customer: stripeCustomerId, currency, id } = subscription;

          const existingSub = await SubscriptionModel.findOne({
            stripeCustomerId,
            stripeSubscriptionId: id,
          }).lean();

          if (!existingSub) {
            console.warn(
              "⚠️ No existing subscription found for deletion event."
            );
            return;
          }

          const { userId, nextPlanId, paymentMethodId, _id } = existingSub;
          await UserModel.findByIdAndUpdate(userId, {
            hasUsedTrial: true,
            isCardSetupComplete: true,
          });

          // 🔑 UPDATE PLAN SCENARIO: Check if this is part of an upgrade flow
          if (nextPlanId) {
            console.log("🔄 Processing subscription upgrade/plan change...");

            await SubscriptionModel.findByIdAndDelete(_id);
            const planData =
              process.env.PAYMENT === "DEV"
                ? await testPlanModel.findById(nextPlanId)
                : await planModel.findById(nextPlanId);

            const newSub = await stripe.subscriptions.create({
              customer:
                typeof stripeCustomerId === "string"
                  ? stripeCustomerId
                  : stripeCustomerId?.id ?? "",
              items: [
                { price: planData?.stripePrices[currency as "eur" | "gbp"] },
              ],
              default_payment_method: paymentMethodId,
              expand: ["latest_invoice.payment_intent"],
            });

            const newSubPrice = newSub.items.data[0]?.price;

            // 🔑 CRITICAL: Handle BACS/SEPA for new subscription
            const paymentMethodType = await getPaymentMethodType(
              paymentMethodId
            );
            let newSubStatus = newSub.status;

            if (shouldTreatAsActive(newSub, paymentMethodType)) {
              newSubStatus = "active";
              console.log(
                `🔧 Adjusted new subscription status to active for ${paymentMethodType}`
              );
            }

            const newSubscription = await SubscriptionModel.create({
              userId,
              stripeCustomerId,
              stripeSubscriptionId: newSub.id,
              planId: nextPlanId,
              paymentMethodId,
              status: newSubStatus,
              trialStart: toDate(newSub.trial_start),
              trialEnd: toDate(newSub.trial_end),
              startDate: toDate(newSub.start_date),
              currentPeriodStart: toDate(newSub.current_period_start),
              currentPeriodEnd: toDate(newSub.current_period_end),
              nextBillingDate: toDate(newSub.current_period_end),
              amount: newSubPrice?.unit_amount
                ? newSubPrice.unit_amount / 100
                : 0,
              currency: newSubPrice?.currency ?? "inr",
              nextPlanId: null,
            });

            await NotificationService(
              [userId] as any,
              "SUBSCRIPTION_RENEWED", // or "PLAN_UPGRADED" if you have that notification type
              newSubscription?._id as ObjectId
            );
          } else {
            // 🔑 REGULAR CANCELLATION (not upgrade)
            await SubscriptionModel.findByIdAndUpdate(_id, {
              $set: {
                status: "canceled",
                trialEnd: null,
                startDate: null,
                currentPeriodEnd: null,
                currentPeriodStart: null,
                nextBillingDate: null,
              },
            });

            await stripe.paymentMethods.detach(paymentMethodId);
            await TokenModel.findOneAndDelete({ userId });
            await NotificationService(
              [userId] as any,
              "SUBSCRIPTION_CANCELLED",
              _id as ObjectId
            );
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event?.data?.object as Stripe.Invoice;
          const customerId = invoice?.customer as string;

          const existing = await SubscriptionModel.findOne({
            stripeCustomerId: customerId,
          });

          if (!existing) break;

          const subscriptionId = existing?.stripeSubscriptionId as string;
          const userId = existing?.userId;

          // 🔑 CRITICAL: Always ensure status is active when payment succeeds
          const lineItem = invoice?.lines?.data?.[0];
          const period = lineItem?.period;

          await SubscriptionModel.findOneAndUpdate(
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            {
              $set: {
                status: "active", // Always active when payment succeeds
                currentPeriodStart: toDate(period?.start),
                currentPeriodEnd: toDate(period?.end),
                nextBillingDate: toDate(period?.end),
              },
            }
          );

          const pi =
            typeof invoice.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice?.payment_intent;

          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }

          const card = charge?.payment_method_details?.card;

          // 🔑 NOTIFICATION LOGIC
          const billingReason = invoice.billing_reason;
          if (billingReason === "subscription_create") {
            if (invoice.amount_paid > 0) {
              await NotificationService(
                [userId],
                "SUBSCRIPTION_STARTED",
                existing?._id as ObjectId
              );
            } else {
              await NotificationService(
                [userId],
                "FREETRIAL_STARTED",
                existing?._id as ObjectId
              );
            }
          } else if (billingReason === "subscription_cycle") {
            await NotificationService(
              [userId],
              "SUBSCRIPTION_RENEWED",
              existing?._id as ObjectId
            );
          } else if (billingReason === "subscription_update") {
            await NotificationService(
              [userId],
              "SUBSCRIPTION_STARTED",
              existing?._id as ObjectId
            );
          }

          // Create transaction
          await TransactionModel.create({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            invoiceId: invoice.id,
            paymentIntentId: pi?.id,
            status: "succeeded",
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            paymentMethodDetails: {
              brand: card?.brand ?? "unknown",
              last4: card?.last4 ?? "0000",
              expMonth: card?.exp_month ?? 0,
              expYear: card?.exp_year ?? 0,
              type: card ? "card" : "unknown",
            },
            billingReason: invoice.billing_reason,
            paidAt: toDate(invoice.status_transitions?.paid_at) ?? new Date(),
          });

          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const existing = await SubscriptionModel.findOne({
            stripeCustomerId: customerId,
          });

          if (!existing) break;

          const subscriptionId = existing?.stripeSubscriptionId as string;
          const userId = existing.userId;

          const pi =
            typeof invoice?.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice.payment_intent;

          // 🔑 CRITICAL: Don't mark BACS/SEPA as past_due for pending payments
          const paymentMethodType = await getPaymentMethodType(
            existing.paymentMethodId
          );
          const isBacsOrSepa =
            paymentMethodType === "bacs_debit" ||
            paymentMethodType === "sepa_debit";

          // Only update to past_due if it's NOT a BACS/SEPA payment that's just pending
          const isActualFailure =
            pi?.last_payment_error?.type !== undefined &&
            pi?.last_payment_error?.code !==
              "payment_intent_authentication_failure";

          if (isActualFailure) {
            const invoiceFull = await stripe.invoices.retrieve(invoice.id);
            if (invoiceFull.attempt_count >= 3) {
              await stripe.subscriptions.cancel(subscriptionId); // Immediate cancel after max retries
              await NotificationService(
                [userId],
                "SUBSCRIPTION_FAILED",
                existing._id as ObjectId
              );
            }
          } else if (!isBacsOrSepa) {
            // For non-BACS/SEPA methods (e.g., cards), set to past_due immediately on any failure
            await SubscriptionModel.updateOne(
              { stripeSubscriptionId: subscriptionId },
              { $set: { status: "past_due" } }
            );
            await NotificationService(
              [userId],
              "SUBSCRIPTION_FAILED",
              existing._id as ObjectId
            );
          }

          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }
          const card = charge?.payment_method_details?.card;

          await TransactionModel.create({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            invoiceId: invoice.id,
            paymentIntentId: pi?.id,
            status: isActualFailure ? "failed" : "pending",
            amount: invoice.amount_due / 100,
            currency: invoice.currency,
            paymentMethodDetails: {
              brand: card?.brand ?? "unknown",
              last4: card?.last4 ?? "0000",
              expMonth: card?.exp_month ?? 0,
              expYear: card?.exp_year ?? 0,
              type: card ? "card" : "unknown",
            },
            billingReason: invoice.billing_reason,
            errorMessage:
              pi?.last_payment_error?.message ?? "Payment processing",
            paidAt: new Date(),
          });

          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.mode !== "subscription" || !session.subscription) break;

          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          let paymentMethodId = subscription.default_payment_method as
            | string
            | null;
          const stripeCustomerId = subscription.customer as string;
          const item = subscription.items?.data?.[0];
          const planAmount = item?.price?.unit_amount ?? 0;
          const currency = item?.price?.currency ?? "gbp";
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;

          // 🔑 CRITICAL: Handle BACS/SEPA for checkout
          const paymentMethodType = await getPaymentMethodType(paymentMethodId);
          let subStatus = subscription.status;

          if (shouldTreatAsActive(subscription, paymentMethodType)) {
            subStatus = "active";
            console.log(
              `🔧 Adjusted checkout status to active for ${paymentMethodType}`
            );
          }

          await SubscriptionModel.findOneAndDelete({ userId });
          await UserModel.findByIdAndUpdate(userId, {
            hasUsedTrial: true,
            isCardSetupComplete: true,
          });

          const newSubscription = await SubscriptionModel.create({
            userId,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            planId,
            paymentMethodId: paymentMethodId,
            status: subStatus,
            trialStart: toDate(subscription.trial_start),
            trialEnd: toDate(subscription.trial_end),
            startDate: toDate(subscription.start_date),
            currentPeriodStart: toDate(subscription.current_period_start),
            currentPeriodEnd: toDate(subscription.current_period_end),
            nextBillingDate: toDate(subscription.current_period_end),
            amount: planAmount / 100,
            currency,
            nextPlanId: null,
          });

          break;
        }

        // 🔑 ADDITIONAL SAFETY NET WEBHOOKS
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          if (paymentIntent.invoice) {
            const invoice = await stripe.invoices.retrieve(
              paymentIntent.invoice as string
            );
            const subscription = await SubscriptionModel.findOne({
              stripeCustomerId: invoice.customer as string,
            });

            if (subscription && subscription.status !== "active") {
              await SubscriptionModel.findByIdAndUpdate(subscription._id, {
                status: "active",
              });
              console.log(
                "🔧 Updated subscription to active via payment_intent.succeeded"
              );
            }
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(
            "💳 Payment failed:",
            paymentIntent.last_payment_error?.message
          );
          // Additional handling if needed
          break;
        }
      }

      console.log("✅ Successfully handled event:", event.type);
      return {};
    } catch (err: any) {
      console.error("***STRIPE EVENT FAILED***", err.message);
      return {};
    }
  },

  async handleInAppAndroidWebhook(payload: any, req: any) {
    const eventTime = Number(payload.eventTimeMillis);
    const packageName = payload.packageName;
    const subNotif = payload.subscriptionNotification;

    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
    );

    if (!subNotif) {
      console.error("No subscription notification in payload");
      return;
    }

    const { notificationType, purchaseToken, subscriptionId } = subNotif;

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidPublisher = google.androidpublisher({
      version: "v3",
      auth: auth,
    });

    const response = await androidPublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: subscriptionId,
      token: purchaseToken,
    });

    const userId = response.data.obfuscatedExternalAccountId;
    const sub = response.data;

    const planData =
      process.env.PAYMENT === "DEV"
        ? await testPlanModel.findOne({
            $or: [
              {
                androidProductId: subscriptionId,
              },
              {
                stripeProductId: subscriptionId,
              },
              {
                iosProductId: subscriptionId,
              },
            ],
          })
        : ((await planModel.findOne({
            $or: [
              {
                androidProductId: subscriptionId,
              },
              {
                stripeProductId: subscriptionId,
              },
              {
                iosProductId: subscriptionId,
              },
            ],
          })) as any);

    // if(!planData){
    //   throw new Error("planNotFound");
    // }

    const {
      startTimeMillis,
      expiryTimeMillis,
      priceCurrencyCode,
      priceAmountMicros,
      paymentState,
      orderId,
    } = sub as any;

    let data;

    console.log(response.data);

    // Notification type ke base pe action log karo
    let actionMessage = "";
    switch (notificationType) {
      case 1:
        actionMessage =
          "SUBSCRIPTION_RECOVERED - Subscription account hold se recover ho gayi ya pause se resume hui";
        data = await SubscriptionModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              amount: priceAmountMicros / 1000000,
              currentPeriodStart: startTimeMillis
                ? new Date(Number(startTimeMillis))
                : null,
              currentPeriodEnd: expiryTimeMillis
                ? new Date(Number(expiryTimeMillis))
                : null,
              currency: priceCurrencyCode.toLowerCase(),
              planId: planData._id,
              status: "active",
            },
          },
          { new: true }
        );

        if (data?.userId) {
          const originalAmount = priceAmountMicros / 1000000; // convert micros → base currency
          const convertedAmountGBP = originalAmount;
          await TransactionModel.create({
            userId: data.userId,
            planId: planData._id,
            status: "succeeded",
            amount: convertedAmountGBP,
            currency: priceCurrencyCode.toLowerCase(),
            paidAt: new Date(eventTime) ?? new Date(),
          });
          await UserModel.findByIdAndUpdate(data.userId, {
            $set: { hasUsedTrial: true },
          });
          await NotificationService(
            [data?.userId] as any,
            "SUBSCRIPTION_RENEWED",
            data?._id as ObjectId
          );
        }
        break;
      case 2:
        actionMessage =
          "SUBSCRIPTION_RENEWED - Active subscription renew ho gayi (payment successful)";
        data = await SubscriptionModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              amount: priceAmountMicros / 1000000,
              currentPeriodStart: startTimeMillis
                ? new Date(Number(startTimeMillis))
                : null,
              currentPeriodEnd: expiryTimeMillis
                ? new Date(Number(expiryTimeMillis))
                : null,
              currency: priceCurrencyCode.toLowerCase(),
              planId: planData._id,
              status: "active",
            },
          },
          { new: true }
        );

        if (data?.userId) {
          const originalAmount = priceAmountMicros / 1000000; // convert micros → base currency
          const convertedAmountGBP = originalAmount;
          await TransactionModel.create({
            userId: data.userId,
            planId: planData._id,
            status: "succeeded",
            amount: convertedAmountGBP,
            currency: priceCurrencyCode.toLowerCase(),
            paidAt: new Date(eventTime) ?? new Date(),
          });
          await UserModel.findByIdAndUpdate(data.userId, {
            $set: { hasUsedTrial: true },
          });
          await NotificationService(
            [data?.userId] as any,
            "SUBSCRIPTION_RENEWED",
            data?._id as ObjectId
          );
        }

        break;
      case 3:
        actionMessage =
          "SUBSCRIPTION_CANCELED - Subscription cancel ho gayi (user ne voluntarily/involuntarily cancel ki)";
        data = await SubscriptionModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              status: "canceling",
            },
          },
          { new: true }
        );
        if (data?.userId) {
          await NotificationService(
            [data?.userId] as any,
            "SUBSCRIPTION_CANCELLED",
            data?._id as ObjectId
          );
        }

        break;
      case 4:
        actionMessage =
          "SUBSCRIPTION_PURCHASED - Naya subscription purchase ho gaya";

        await SubscriptionModel.findOneAndUpdate(
          {
            userId,
          },
          {
            $set: {
              deviceType: "ANDROID",
              subscriptionId,
              amount:
                paymentState === 2
                  ? 0
                  : paymentState === 1
                  ? priceAmountMicros / 1000000
                  : 0,
              currentPeriodStart:
                paymentState === 1 ? new Date(Number(startTimeMillis)) : null,
              currentPeriodEnd:
                paymentState === 1 ? new Date(Number(expiryTimeMillis)) : null,
              startDate: startTimeMillis
                ? new Date(Number(startTimeMillis))
                : null,
              trialStart:
                paymentState === 2 ? new Date(Number(startTimeMillis)) : null,
              trialEnd:
                paymentState === 2 ? new Date(Number(expiryTimeMillis)) : null,
              currency: priceCurrencyCode.toLowerCase(),
              planId: planData._id,
              status:
                paymentState === 2
                  ? "trialing"
                  : paymentState === 1
                  ? "active"
                  : "incomplete",
            },
          },
          {
            upsert: true,
          }
        );

        break;
      case 5:
        actionMessage =
          "SUBSCRIPTION_ON_HOLD - Subscription account hold pe chali gayi (payment issue)";
        break;
      case 6:
        actionMessage =
          "SUBSCRIPTION_IN_GRACE_PERIOD - Grace period mein enter ho gayi (trial/renewal delay)";

        data = await SubscriptionModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              status: "past_due",
            },
          },
          { new: true }
        );
        if (data?.userId) {
          await NotificationService(
            [data?.userId] as any,
            "SUBSCRIPTION_FAILED",
            data?._id as ObjectId
          );
        }
        break;
      case 7:
        actionMessage =
          "SUBSCRIPTION_RESTARTED - User ne canceled subscription ko restore kar liya (Play > Account > Subscriptions se)";
        data = await SubscriptionModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              amount: priceAmountMicros / 1000000,
              currentPeriodStart: startTimeMillis
                ? new Date(Number(startTimeMillis))
                : null,
              currentPeriodEnd: expiryTimeMillis
                ? new Date(Number(expiryTimeMillis))
                : null,
              currency: priceCurrencyCode.toLowerCase(),
              planId: planData._id,
              status: "active",
            },
          },
          { new: true }
        );

        if (data?.userId) {
          const originalAmount = priceAmountMicros / 1000000; // convert micros → base currency
          const convertedAmountGBP = originalAmount;
          await TransactionModel.findOneAndUpdate({
            userId: data.userId,
            planId: planData._id,
            status: "succeeded",
            amount: convertedAmountGBP,
            currency: priceCurrencyCode.toLowerCase(),
            paidAt: new Date(eventTime) ?? new Date(),
          });
          await UserModel.findByIdAndUpdate(data.userId, {
            $set: { hasUsedTrial: true },
          });
          await NotificationService(
            [data?.userId] as any,
            "SUBSCRIPTION_RENEWED",
            data?._id as ObjectId
          );
        }

        break;
      case 8:
        actionMessage =
          "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED (DEPRECATED) - User ne price change confirm kar liya";
        break;
      case 9:
        actionMessage =
          "SUBSCRIPTION_DEFERRED - Subscription ka recurrence time extend ho gaya (future date pe shift)";
        break;
      case 10:
        actionMessage =
          "SUBSCRIPTION_PAUSED - User ne subscription pause kar di";
        break;
      case 11:
        actionMessage =
          "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED - Pause schedule change ho gaya";
        break;
      case 12:
        actionMessage =
          "SUBSCRIPTION_REVOKED - Subscription user se revoke ho gayi (refund/chargeback se pehle expire)";
        break;
      case 13:
        actionMessage =
          "SUBSCRIPTION_EXPIRED - Subscription expire ho gayi, ab inactive hai";

        if (
          response?.data?.cancelReason &&
          response?.data?.cancelReason === 2
        ) {
          break;
        } else {
          data = await SubscriptionModel.findOneAndUpdate(
            { userId },
            {
              $set: {
                status: "canceled",
              },
            }
          ).lean();

          if (data?.userId) {
            await UserModel.findByIdAndUpdate(data.userId, {
              $set: { hasUsedTrial: true },
            });
          }
        }

        break;
      case 19:
        actionMessage =
          "SUBSCRIPTION_PRICE_CHANGE_UPDATED - Subscription item ka price change details update ho gaye";
        break;
      case 20:
        actionMessage =
          "SUBSCRIPTION_PENDING_PURCHASE_CANCELED - Pending subscription transaction cancel ho gaya";
        break;
      case 22:
        actionMessage =
          "SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED - Price step-up ke liye user consent diya ya period shuru hua";
        break;
      default:
        actionMessage = `UNKNOWN_TYPE_${notificationType} - Google docs check karo latest ke liye`;
    }

    console.log("🚨 ACTION:", actionMessage);
    console.log("--- Subscription Status Update Complete ---");

    // Yahan MongoDB logic add karo based on type, e.g.:
    // if (notificationType === 13) {
    //   await db.collection('users').updateOne({ purchaseToken }, { $set: { subscriptionStatus: 'expired', expiredAt: new Date() } });
    // } else if (notificationType === 1) {
    //   await db.collection('users').updateOne({ purchaseToken }, { $set: { subscriptionStatus: 'active', renewedAt: new Date() } });
    // }
    // ... etc. for other types
  },

  async handleInAppIOSWebhook(payload: any, req: any, res: any) {
    try {
      const webHookData = payload?.data;

      const environment =
        webHookData?.environment || payload?.environment || "Production";

      if (environment !== "Sandbox") {
        return res.status(200).json({
          received: true,
          warning: "Invalid environment",
        });
      }

      // console.log(
      //   `[iOS WEBHOOK] Environment: ${environment}, Type: ${payload?.notificationType}`
      // );

      const [transactionInfo, renewalInfo] = await Promise.all([
        webHookData.signedTransactionInfo
          ? decodeSignedPayload(webHookData.signedTransactionInfo)
          : null,
        webHookData.signedRenewalInfo
          ? decodeSignedPayload(webHookData.signedRenewalInfo)
          : null,
      ]);

      const notificationType = payload?.notificationType;
      const subtype = payload?.subtype;

      const productId =
        renewalInfo?.autoRenewProductId || transactionInfo?.productId;

      const originalTransactionId =
        transactionInfo?.originalTransactionId ||
        renewalInfo?.originalTransactionId;

      const transactionId = transactionInfo?.transactionId;
      const priceMicros = renewalInfo?.renewalPrice ?? transactionInfo?.price;
      const currency =
        (transactionInfo?.currency as string) ||
        (renewalInfo?.currency as string);

      const purchaseDate = transactionInfo?.purchaseDate as Date;
      const expiresDate = transactionInfo?.expiresDate as Date;

      const appAccountToken =
        transactionInfo?.appAccountToken || renewalInfo?.appAccountToken;

      const planModelToUse =
        process.env.PAYMENT === "DEV" ? testPlanModel : planModel;

      const [userData, planData] = await Promise.all([
        UserModel.findOne({ uuid: appAccountToken }),
        planModelToUse.findOne({
          $or: [
            { androidProductId: productId },
            { stripeProductId: productId },
            { iosProductId: productId },
          ],
        }),
      ]);

      if (!planData)
        return res.status(200).json({
          received: true,
          warning: "Plan not found",
        });

      const userId = userData?._id ?? null;
      const amountBase =
        typeof priceMicros === "number" ? priceMicros / 1000 : 0;
      const linkedPurchaseToken = originalTransactionId;

      let data: any = null;

      // console.log(
      //   `[${notificationType}]`,
      //   `Subtype: ${subtype || "None"}`,
      //   `Env: ${environment}`,
      //   `Price: ${amountBase}`,
      //   `UserId: ${userId || "Not Present"}`,
      //   `User: ${userData?.fullName || ""}`
      // );

      switch (notificationType) {
        case "SUBSCRIBED":
        case "DID_CHANGE_RENEWAL_PREF":
          if (subtype === "RESUBSCRIBE") {
            const existingSubscription = await SubscriptionModel.findOne({
              userId: userId,
              environment
            });

            if (!existingSubscription) {
              break;
            } else {
              data = await SubscriptionModel.findByIdAndUpdate(
                existingSubscription._id,
                {
                  $set: {
                    subscriptionId: productId,
                    amount: amountBase ?? 0,
                    currentPeriodStart: purchaseDate,
                    currentPeriodEnd: expiresDate,
                    currency: currency.toLowerCase(),
                    planId: planData._id,
                    status: "active",
                    trialStart: null,
                    trialEnd: null,
                    environment: environment,
                  },
                },
                { new: true }
              );

              console.log(
                `✅ Reactivated subscription ${existingSubscription._id}`
              );
            }

            // Handle notifications and transactions
            if (userId) {
              await TransactionModel.create({
                orderId: transactionId,
                userId: userId,
                planId: planData._id,
                status: "succeeded",
                amount: amountBase,
                currency: currency.toLowerCase(),
                paidAt: new Date(purchaseDate) ?? new Date(),
                environment: environment,
              });
              await UserModel.findByIdAndUpdate(userId, {
                $set: { hasUsedTrial: true },
              });

              await NotificationService(
                [userId] as any,
                "SUBSCRIPTION_RENEWED",
                existingSubscription._id as any
              );
            }

            break; // Exit switch after handling RESUBSCRIBE
          }

          if (subtype === "INITIAL_BUY") {
            // const data = await SubscriptionModel.create({
            //   orderId: linkedPurchaseToken,
            //   userId: userId,
            //   deviceType: "IOS",
            //   subscriptionId: productId,
            //   amount: 0,
            //   currentPeriodStart: null,
            //   currentPeriodEnd: null,
            //   startDate: purchaseDate,
            //   trialStart: purchaseDate,
            //   trialEnd: expiresDate,
            //   currency: currency,
            //   planId: planData._id,
            //   status: "trialing",
            //   environment: environment,
            // });

            if (userId) {
              await NotificationService(
                [userId as any],
                "FREETRIAL_STARTED",
                data._id as Types.ObjectId
              );
            }

            break; // Exit switch after handling INITIAL_BUY
          }
          break;

        case "DID_RENEW":
          const subscriptionToRenew = await SubscriptionModel.findOne({
            userId: userId,
            environment,
          });

          if (!subscriptionToRenew) {
            console.warn(
              `⚠️ DID_RENEW for unknown subscription: ${linkedPurchaseToken}`
            );
            break;
          }

          if (subscriptionToRenew.status === "canceled") {
            console.warn(
              `⚠️ Ignoring renewal for canceled subscription: ${linkedPurchaseToken}`
            );
            break;
          }

          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            {
              $set: {
                amount: amountBase ?? 0,
                currentPeriodStart: purchaseDate
                  ? new Date(Number(purchaseDate))
                  : null,
                currentPeriodEnd: expiresDate
                  ? new Date(Number(expiresDate))
                  : null,
                currency: currency.toLowerCase() || "usd",
                planId: planData._id,
                subscriptionId: productId,
                status: "active",
                trialStart: null,
                trialEnd: null,
                environment: environment,
              },
            },
            { new: true }
          );

          if (data?.userId) {
            await TransactionModel.create({
              userId: data.userId,
              orderId: transactionId,
              planId: planData._id,
              status: "succeeded",
              amount: amountBase,
              currency: currency.toLowerCase(),
              paidAt: new Date(purchaseDate) ?? new Date(),
              environment: environment,
            });

            await UserModel.findByIdAndUpdate(data.userId, {
              $set: { hasUsedTrial: true },
            });

            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_RENEWED",
              data._id as any
            );
          }
          break;

        case "DID_FAIL_TO_RENEW":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "past_due" } },
            { new: true }
          );
          if (data?.userId) {
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_FAILED",
              data._id as any
            );
          }
          break;

        case "REVOKE":
        case "EXPIRED":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "canceled" } },
            { new: true }
          );
          if (data?.userId) {
            await UserModel.findByIdAndUpdate(data.userId, {
              $set: { hasUsedTrial: true },
            });
            await TokenModel.findOneAndDelete({ userId: data.userId });
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_CANCELLED",
              data._id as any
            );
          }
          break;

        case "REFUND":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "canceled" } },
            { new: true }
          );

          if (data?.userId) {
            await TransactionModel.findOneAndUpdate(
              { orderId: transactionId, userId: data.userId },
              { $set: { status: "refunded" } }
            );

            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_CANCELLED",
              data._id as any
            );
          }
          break;

        case "DID_CHANGE_RENEWAL_STATUS":
          if (subtype === "AUTO_RENEW_DISABLED") {
            data = await SubscriptionModel.findOneAndUpdate(
              { userId: userId, environment },
              { $set: { status: "canceling" } },
              { new: true }
            );

            if (data?.userId) {
              await NotificationService(
                [data.userId] as any,
                "SUBSCRIPTION_CANCELLED",
                data._id as any
              );
            }
          } else if (subtype === "AUTO_RENEW_ENABLED") {
            data = await SubscriptionModel.findOneAndUpdate(
              { userId: userId, environment },
              { $set: { status: "active" } },
              { new: true }
            );
          }
          break;

        case "DID_RECOVER":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            {
              $set: {
                status: "active",
                currentPeriodStart: purchaseDate,
                currentPeriodEnd: expiresDate,
                environment: environment,
              },
            },
            { new: true }
          );

          if (data?.userId) {
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_RENEWED",
              data._id as any
            );
          }
          break;

        case "TEST":
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("Error handling iOS webhook:", err);
      return;
    }
  },
  async handleInAppIOSWebhookProduction(payload: any, req: any, res: any) {
    try {
      const webHookData = payload?.data;

      const environment =
        webHookData?.environment || payload?.environment || "Production";

      if (environment !== "Production") {
        return res.status(200).json({
          received: true,
          warning: "Invalid environment",
        });
      }

      // console.log(
      //   `[iOS WEBHOOK] Environment: ${environment}, Type: ${payload?.notificationType}`
      // );

      const [transactionInfo, renewalInfo] = await Promise.all([
        webHookData.signedTransactionInfo
          ? decodeSignedPayload(webHookData.signedTransactionInfo)
          : null,
        webHookData.signedRenewalInfo
          ? decodeSignedPayload(webHookData.signedRenewalInfo)
          : null,
      ]);

      const notificationType = payload?.notificationType;
      const subtype = payload?.subtype;

      const productId =
        renewalInfo?.autoRenewProductId || transactionInfo?.productId;

      const originalTransactionId =
        transactionInfo?.originalTransactionId ||
        renewalInfo?.originalTransactionId;

      const transactionId = transactionInfo?.transactionId;
      const priceMicros = renewalInfo?.renewalPrice ?? transactionInfo?.price;
      const currency =
        (transactionInfo?.currency as string) ||
        (renewalInfo?.currency as string);

      const purchaseDate = transactionInfo?.purchaseDate as Date;
      const expiresDate = transactionInfo?.expiresDate as Date;

      const appAccountToken =
        transactionInfo?.appAccountToken || renewalInfo?.appAccountToken;

      const planModelToUse =
        process.env.PAYMENT === "DEV" ? testPlanModel : planModel;

      const [userData, planData] = await Promise.all([
        UserModel.findOne({ uuid: appAccountToken }),
        planModelToUse.findOne({
          $or: [
            { androidProductId: productId },
            { stripeProductId: productId },
            { iosProductId: productId },
          ],
        }),
      ]);

      if (!planData)
        return res.status(200).json({
          received: true,
          warning: "Plan not found",
        });

      const userId = userData?._id ?? null;
      const amountBase =
        typeof priceMicros === "number" ? priceMicros / 1000 : 0;
      const linkedPurchaseToken = originalTransactionId;

      let data: any = null;

      // console.log(
      //   `[${notificationType}]`,
      //   `Subtype: ${subtype || "None"}`,
      //   `Env: ${environment}`,
      //   `Price: ${amountBase}`,
      //   `UserId: ${userId || "Not Present"}`,
      //   `User: ${userData?.fullName || ""}`
      // );

      switch (notificationType) {
        case "SUBSCRIBED":
        case "DID_CHANGE_RENEWAL_PREF":
          if (subtype === "RESUBSCRIBE") {
            const existingSubscription = await SubscriptionModel.findOne({
              userId: userId,
              environment
            });

            if (!existingSubscription) {
              break;
            } else {
              data = await SubscriptionModel.findByIdAndUpdate(
                existingSubscription._id,
                {
                  $set: {
                    subscriptionId: productId,
                    amount: amountBase ?? 0,
                    currentPeriodStart: purchaseDate,
                    currentPeriodEnd: expiresDate,
                    currency: currency.toLowerCase(),
                    planId: planData._id,
                    status: "active",
                    trialStart: null,
                    trialEnd: null,
                    environment: environment,
                  },
                },
                { new: true }
              );

              console.log(
                `✅ Reactivated subscription ${existingSubscription._id}`
              );
            }

            // Handle notifications and transactions
            if (userId) {
              await TransactionModel.create({
                orderId: transactionId,
                userId: userId,
                planId: planData._id,
                status: "succeeded",
                amount: amountBase,
                currency: currency.toLowerCase(),
                paidAt: new Date(purchaseDate) ?? new Date(),
                environment: environment,
              });
              await UserModel.findByIdAndUpdate(userId, {
                $set: { hasUsedTrial: true },
              });

              await NotificationService(
                [userId] as any,
                "SUBSCRIPTION_RENEWED",
                existingSubscription._id as any
              );
            }

            break; // Exit switch after handling RESUBSCRIBE
          }

          if (subtype === "INITIAL_BUY") {
            // const data = await SubscriptionModel.create({
            //   orderId: linkedPurchaseToken,
            //   userId: userId,
            //   deviceType: "IOS",
            //   subscriptionId: productId,
            //   amount: 0,
            //   currentPeriodStart: null,
            //   currentPeriodEnd: null,
            //   startDate: purchaseDate,
            //   trialStart: purchaseDate,
            //   trialEnd: expiresDate,
            //   currency: currency,
            //   planId: planData._id,
            //   status: "trialing",
            //   environment: environment,
            // });

            if (userId) {
              await NotificationService(
                [userId as any],
                "FREETRIAL_STARTED",
                data._id as Types.ObjectId
              );
            }

            break; // Exit switch after handling INITIAL_BUY
          }
          break;

        case "DID_RENEW":
          const subscriptionToRenew = await SubscriptionModel.findOne({
            userId: userId,
            environment
          });

          if (!subscriptionToRenew) {
            console.warn(
              `⚠️ DID_RENEW for unknown subscription: ${linkedPurchaseToken}`
            );
            break;
          }

          if (subscriptionToRenew.status === "canceled") {
            console.warn(
              `⚠️ Ignoring renewal for canceled subscription: ${linkedPurchaseToken}`
            );
            break;
          }

          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            {
              $set: {
                amount: amountBase ?? 0,
                currentPeriodStart: purchaseDate
                  ? new Date(Number(purchaseDate))
                  : null,
                currentPeriodEnd: expiresDate
                  ? new Date(Number(expiresDate))
                  : null,
                currency: currency.toLowerCase() || "usd",
                planId: planData._id,
                subscriptionId: productId,
                status: "active",
                trialStart: null,
                trialEnd: null,
                environment: environment,
              },
            },
            { new: true }
          );

          if (data?.userId) {
            await TransactionModel.create({
              userId: data.userId,
              orderId: transactionId,
              planId: planData._id,
              status: "succeeded",
              amount: amountBase,
              currency: currency.toLowerCase(),
              paidAt: new Date(purchaseDate) ?? new Date(),
              environment: environment,
            });

            await UserModel.findByIdAndUpdate(data.userId, {
              $set: { hasUsedTrial: true },
            });

            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_RENEWED",
              data._id as any
            );
          }
          break;

        case "DID_FAIL_TO_RENEW":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "past_due" } },
            { new: true }
          );
          if (data?.userId) {
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_FAILED",
              data._id as any
            );
          }
          break;

        case "REVOKE":
        case "EXPIRED":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "canceled" } },
            { new: true }
          );
          if (data?.userId) {
            await UserModel.findByIdAndUpdate(data.userId, {
              $set: { hasUsedTrial: true },
            });
            await TokenModel.findOneAndDelete({ userId: data.userId });
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_CANCELLED",
              data._id as any
            );
          }
          break;

        case "REFUND":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            { $set: { status: "canceled" } },
            { new: true }
          );

          if (data?.userId) {
            await TransactionModel.findOneAndUpdate(
              { orderId: transactionId, userId: data.userId },
              { $set: { status: "refunded" } }
            );

            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_CANCELLED",
              data._id as any
            );
          }
          break;

        case "DID_CHANGE_RENEWAL_STATUS":
          if (subtype === "AUTO_RENEW_DISABLED") {
            data = await SubscriptionModel.findOneAndUpdate(
              { userId: userId, environment },
              { $set: { status: "canceling" } },
              { new: true }
            );

            if (data?.userId) {
              await NotificationService(
                [data.userId] as any,
                "SUBSCRIPTION_CANCELLED",
                data._id as any
              );
            }
          } else if (subtype === "AUTO_RENEW_ENABLED") {
            data = await SubscriptionModel.findOneAndUpdate(
              { userId: userId, environment },
              { $set: { status: "active" } },
              { new: true }
            );
          }
          break;

        case "DID_RECOVER":
          data = await SubscriptionModel.findOneAndUpdate(
            { userId: userId, environment },
            {
              $set: {
                status: "active",
                currentPeriodStart: purchaseDate,
                currentPeriodEnd: expiresDate,
                environment: environment,
              },
            },
            { new: true }
          );

          if (data?.userId) {
            await NotificationService(
              [data.userId] as any,
              "SUBSCRIPTION_RENEWED",
              data._id as any
            );
          }
          break;

        case "TEST":
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("Error handling iOS webhook:", err);
      return;
    }
  },
};

export const jobServices = {
  async createJob(payload: any) {
    const { en, date, time, timeZone, ...restData } = payload;

    // Function to translate the language of jobs
    const result = await translateJobFields(payload.en);
    const { nl, fr, es } = result;

    const jobDateTimeUTC = convertToUTC(date, time, timeZone);

    // const jobDateTimeUTC = new Date(date);
    // jobDateTimeUTC.setUTCHours(time, 0, 0, 0);

    const createdJob = await JobModel.create({
      en,
      nl,
      fr,
      es,
      ...restData,
      date: jobDateTimeUTC,
      time,
    });

    if (createdJob._id && createdJob?.en?.gender) {
      // find all users with the same gender
      const users = await UserInfoModel.find({
        gender: createdJob.en.gender,
      })
        .select("_id userId")
        .lean();

      if (users.length > 0) {
        const userIds = users?.map((u) => u.userId) as [];

        // send notification to all these users
        await NotificationService(userIds, "JOB_ALERT", createdJob._id);
      }
    }

    return createdJob;
  },

  async getJobs(payload: any) {
    const {
      sort,
      search,
      country,
      language = "en",
      page = "1",
      limit = "10",
      branch,
      gender,
      age,
      currency,
    } = payload;
    const filter: any = {};
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;
    if (country) {
      filter.countryCode = country;
    }
    if (search) {
      filter.$or = [
        { [`${language}.title`]: { $regex: search, $options: "i" } },
        { [`${language}.companyName`]: { $regex: search, $options: "i" } },
      ];
    }
    if (branch) {
      filter[`en.branch`] = branch;
    }
    if (gender) {
      filter[`en.gender`] = gender;
    }
    if (age) {
      const ageNumber = parseInt(age as string, 10);
      if (!isNaN(ageNumber)) {
        filter.minAge = { $lte: ageNumber };
        filter.maxAge = { $gte: ageNumber };
      }
    }
    let sortOption: any = {};
    switch (sort) {
      case "oldToNew":
        sortOption.date = 1;
        break;
      case "newToOld":
        sortOption.date = -1;
        break;
      case "highToLowPay":
        sortOption.pay = -1;
        break;
      case "lowToHighPay":
        sortOption.pay = 1;
        break;
    }

    const totalJobs = await JobModel.countDocuments(filter);
    const rawJobs = await JobModel.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    const jobs = rawJobs.map((job: any) => {
      const jobObj = job.toObject();
      const langFields = jobObj[language] || {};
      languages.forEach((langKey) => delete jobObj[langKey]);
      return {
        ...jobObj,
        ...langFields,
      };
    });
    return {
      data: jobs,
      pagination: {
        total: totalJobs,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalJobs / limitNumber),
      },
    };
  },

  async getJobsById(payload: any) {
    let { status = "ALL", page = 1, limit = 10, jobId } = payload;
    page = Number(page);
    limit = Number(limit);

    // Check if job exists
    const jobData = await JobModel.findById(jobId).lean();
    if (!jobData) {
      throw new Error("Invalid Id");
    }

    // Flatten translations
    const revisedData = { ...jobData, ...jobData["en"] };
    delete revisedData.en;
    delete revisedData.fr;
    delete revisedData.es;
    delete revisedData.nl;
    delete revisedData.appliedUsers;

    // Build status match condition
    const statusMatch = status && status !== "ALL" ? { status: status } : {};

    const total = await AppliedJobModel.countDocuments({
      jobId: new mongoose.Types.ObjectId(jobId),
      ...statusMatch,
    });

    // Aggregate applications
    const appliedJobs = await AppliedJobModel.aggregate([
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
          ...statusMatch,
        },
      },
      {
        $lookup: {
          from: "users", // users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "userinfos", // userInfo collection
          localField: "userId",
          foreignField: "userId",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "userInfo.age": {
            $cond: [
              { $ifNull: ["$userInfo.dob", false] },
              {
                $dateDiff: {
                  startDate: "$userInfo.dob",
                  endDate: "$$NOW",
                  unit: "year",
                },
              },
              null,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          jobId: 1,
          status: 1,
          "user._id": 1,
          "user.fullName": 1,
          "user.country": 1,
          "userInfo.gender": 1,
          "userInfo.dob": 1,
          "userInfo.age": 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    return {
      revisedData,
      appliedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getAllJobApplications(payload: any) {
    let { status, page = 1, limit = 10 } = payload;
    page = Number(page);
    limit = Number(limit);

    // Build status match condition
    const statusMatch = status && status !== "ALL" ? { status: status } : {};

    const total = await AppliedJobModel.countDocuments({
      ...statusMatch,
    });

    // Aggregate applications
    const appliedJobs = await AppliedJobModel.aggregate([
      {
        $match: {
          ...statusMatch,
        },
      },
      {
        $lookup: {
          from: "users", // users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "userinfos", // userInfo collection
          localField: "userId",
          foreignField: "userId",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "userInfo.age": {
            $cond: [
              { $ifNull: ["$userInfo.dob", false] },
              {
                $dateDiff: {
                  startDate: "$userInfo.dob",
                  endDate: "$$NOW",
                  unit: "year",
                },
              },
              null,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          jobId: 1,
          status: 1,
          createdAt: 1,
          "user._id": 1,
          "user.fullName": 1,
          "user.country": 1,
          "userInfo.gender": 1,
          "userInfo.dob": 1,
          "userInfo.age": 1,
        },
      },
      { $sort: { createdAt: -1 } }, // ✅ latest on top
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    return {
      appliedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateJobStatus(payload: any) {
    const { status, jobId } = payload;
    const jobData = await AppliedJobModel.findByIdAndUpdate(
      jobId,
      { $set: { status } },
      { new: true }
    ).lean();
    if (jobData?.userId) {
      await NotificationService(
        [jobData?.userId],
        status === "SELECTED" ? "JOB_SHORTLISTED" : "JOB_REJECTED",
        jobId
      );
    }

    return jobData;
  },

  async getJobDataCSV(payload: any) {
    const { jobId } = payload;

    // --- Get Job Info ---
    const jobData = await JobModel.findById(jobId)
      .select("en minAge maxAge minHeightInCm date pay currency countryCode")
      .lean();

    if (!jobData) {
      throw new Error("Invalid Job Id");
    }

    // --- Get Applied Jobs with user info ---
    const appliedJobs = await AppliedJobModel.aggregate([
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
        },
      },
      {
        $lookup: {
          from: "users", // users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "userinfos", // userInfo collection
          localField: "userId",
          foreignField: "userId",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          "userInfo.age": {
            $cond: [
              { $ifNull: ["$userInfo.dob", false] },
              {
                $dateDiff: {
                  startDate: "$userInfo.dob",
                  endDate: "$$NOW",
                  unit: "year",
                },
              },
              null,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          status: 1,
          "user.fullName": 1,
          "user.country": 1,
          "userInfo.gender": 1,
          "userInfo.dob": 1,
          "userInfo.age": 1,
        },
      },
    ]);

    // --- Map to CSV rows ---
    const rows = appliedJobs.map((job) => ({
      fullName: job.user.fullName,
      country: job.user.country,
      gender: job.userInfo?.gender || "",
      dob: job.userInfo?.dob
        ? new Date(job.userInfo.dob).toISOString().split("T")[0]
        : "",
      age: job.userInfo?.age ?? "",
      status: job.status,
    }));

    // --- Build CSV Data ---
    const jobMeta = [
      { Field: "Job Title", Value: jobData?.en?.title },
      { Field: "Min Age", Value: jobData.minAge ?? "" },
      { Field: "Max Age", Value: jobData.maxAge ?? "" },
      { Field: "Payment", Value: jobData.pay ?? "" },
      { Field: "Currency", Value: jobData.currency ?? "" },
      { Field: "Job Date", Value: jobData.date ?? "" },
      { Field: "Location", Value: jobData.countryCode ?? "" },
    ];

    // Convert both sections into CSV separately
    const jobParser = new Parser({ fields: ["Field", "Value"] });
    const jobCsv = jobParser.parse(jobMeta);

    const userFields = [
      { label: "Full Name", value: "fullName" },
      { label: "Country", value: "country" },
      { label: "Gender", value: "gender" },
      { label: "Date of Birth", value: "dob" },
      { label: "Age", value: "age" },
      { label: "Application Status", value: "status" },
    ];
    const userParser = new Parser({ fields: userFields });
    const usersCsv = userParser.parse(rows);

    // Merge with a blank line in between
    const csv = jobCsv + "\n\n" + usersCsv;

    return { csv, title: jobData?.en?.title || "" };
  },
};

export const taskServices = {
  async createTask(payload: any) {
    const {
      title = null,
      description = null,
      subject = "Modeling",
      link = [],
      newMilestone = false,
      taskType,
      answerType,
    } = payload;

    if (
      ![
        "LINK",
        "TEXT",
        "WATCH_VIDEO",
        "DOWNLOAD_FILE",
        "JOB_SELECTED",
        "CHECK_BOX",
        "QUIZ",
        "CALENDLY",
      ].includes(taskType)
    ) {
      throw new Error("Invalid task type");
    }

    if (
      ![
        "UPLOAD_FILE",
        "DONE",
        "WRITE_SECTION",
        "UPLOAD_IMAGE",
        "UPLOAD_VIDEO",
        "CALENDLY",
      ].includes(answerType)
    ) {
      throw new Error("Invalid answer type");
    }

    if (!title) {
      throw new Error("Missing title");
    }

    const lastTask = await TaskModel.findOne({})
      .sort({ taskNumber: -1 }) // descending order
      .limit(1)
      .lean();

    // English base fields
    const en = {
      title,
      description,
      subject,
    };

    // Generate translations for other languages
    const { nl, fr, es } = await translateJobFields(en);

    // Create new task
    const newTask = new TaskModel({
      en,
      nl,
      fr,
      es,
      link,
    });

    newTask.taskNumber = (lastTask?.taskNumber || 0) + 1;
    if (newMilestone) {
      newTask.milestone = (lastTask?.milestone || 0) + 1;
    } else {
      newTask.milestone = lastTask?.milestone;
    }
    newTask.taskType = taskType;
    newTask.answerType = answerType;

    await newTask.save();

    return newTask;
  },

  async updateTask(payload: any) {
    const { data, taskId } = payload;

    const task = await TaskModel.findById(taskId);

    if (!task) {
      throw new Error("taskNotFound");
    }

    const {
      title = null,
      description = null,
      subject = null,
      link = [],
    } = data;

    let en = {};

    if (title || description || subject) {
      en = {
        title: data.title,
        description: data.description,
        subject: data.subject,
      };
      const { nl, fr, es } = await translateJobFields(en);
      task.en = en;
      task.nl = nl;
      task.fr = fr;
      task.es = es;
    }

    if (Array.isArray(task.link) && task.link.length) {
      // Find removed items
      const removedLinks = task.link.filter(
        (oldFile: string) => !link.includes(oldFile)
      );

      // Only delete INTERNAL S3 paths (skip YouTube, http, etc.)
      const s3FilesToDelete = removedLinks.filter(
        (file: string) => !file.startsWith("http")
      );

      if (s3FilesToDelete.length > 0) {
        try {
          await Promise.all(
            s3FilesToDelete.map((file: string) => deleteFileFromS3(file))
          );
        } catch (err) {
          console.error("S3 delete error:", err);
        }
      }
    }

    task.link = link;

    task.save();

    return task;
  },

  async getTasks(payload: any) {
    const page = Number(payload.page) || 1;
    const limit = Number(payload.limit) || 10;
    const search = Number(payload.search) || "";
    const taskType = payload.taskType || "";

    const skip = (page - 1) * limit;

    const matchCondidtion = search
      ? { isActive: true, taskNumber: search }
      : ({ isActive: true } as any);

    if (taskType) {
      matchCondidtion["taskType"] = taskType;
    }

    const result = await TaskModel.aggregate([
      {
        $match: matchCondidtion,
      },
      {
        $lookup: {
          from: "taskresponses", // 👈 collection name for TaskResponse
          let: { taskNum: "$taskNumber", ms: "$milestone" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$taskNumber", "$$taskNum"] },
                    { $eq: ["$milestone", "$$ms"] },
                    { $eq: ["$adminReviewed", true] },
                  ],
                },
              },
            },
          ],
          as: "completedUsers",
        },
      },
      {
        $addFields: {
          completedCount: { $size: "$completedUsers" }, // 👈 count of completed
        },
      },
      {
        $project: {
          taskType: 1,
          answerType: 1,
          taskNumber: 1,
          milestone: 1,
          title: "$en.title",
          description: "$en.description",
          subject: "$en.subject",
          completedCount: 1,
        },
      },
      { $sort: { taskNumber: 1 } },
      {
        $facet: {
          tasks: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const tasks = result[0]?.tasks || [];
    const total = result[0]?.meta[0]?.total || 0;

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getTaskById(payload: any) {
    const { taskId, language = "en" } = payload;

    const task = (await TaskModel.findById(taskId)
      .select(`en taskType answerType link taskNumber milestone count`)
      .lean()) as any;

    if (!task) {
      throw new Error("taskNotFound");
    }

    let response = {
      ...task,
      ...task[language],
    };

    delete response.en;

    if (task.taskType == "QUIZ") {
      const quizData = await QuizModel.aggregate([
        {
          $match: { taskId: new mongoose.Types.ObjectId(taskId) },
        },
        {
          $project: {
            taskId: 1,
            questionNumber: 1,
            answer: 1,
            question: `$en.question`,
            option_A: `$en.option_A`,
            option_B: `$en.option_B`,
            option_C: `$en.option_C`,
            option_D: `$en.option_D`,
          },
        },
        {
          $sort: { questionNumber: 1 },
        },
      ]);

      response["quiz"] = quizData;
    }

    if (task.taskType == "CHECK_BOX") {
      const checkbox = (await CheckboxModel.findOne({ taskId }).lean()) as any;
      const data = checkbox ? checkbox[language] : {};
      response["checkbox"] = data;
    }

    return response;
  },

  // async addQuiz(payload: any) {
  //   const { taskId, quiz } = payload;

  //   const task = await TaskModel.findById(taskId);

  //   if (!task) {
  //     throw new Error("taskNotFound");
  //   }

  //   const newQuiz = quiz
  //     .filter((q: any) => !q._id)
  //     .map((q: any) => ({
  //       taskId,
  //       en: {
  //         question: q.question,
  //         option_A: q.option_A,
  //         option_B: q.option_B,
  //         option_C: q.option_C,
  //         option_D: q.option_D,
  //       },
  //       questionNumber: q.questionNumber,
  //       answer: q.answer,
  //     }));

  //   if (!newQuiz.length) return {}; // nothing new to add

  //   const translatedQuizzes = await Promise.all(
  //     newQuiz.map(async (q: any) => {
  //       const { nl, fr, es } = await translateJobFields(q.en);
  //       return { ...q, nl, fr, es };
  //     })
  //   );

  //   await QuizModel.insertMany(translatedQuizzes);

  //   return {};
  // },

  async addQuiz(payload: any) {
    const { taskId, quiz } = payload;

    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new Error("taskNotFound");
    }

    // Separate new and existing quizzes
    const newQuizzes = quiz.filter((q: any) => !q._id);
    const existingQuizzes = quiz.filter((q: any) => q._id);

    /** ------------------ INSERT NEW QUIZZES ------------------ **/
    if (newQuizzes.length > 0) {
      const formattedNew = newQuizzes.map((q: any) => ({
        taskId,
        en: {
          question: q.question,
          option_A: q.option_A,
          option_B: q.option_B,
          option_C: q.option_C,
          option_D: q.option_D,
        },
        questionNumber: q.questionNumber,
        answer: q.answer,
      }));

      const translatedNew = await Promise.all(
        formattedNew.map(async (q: any) => {
          const { nl, fr, es } = await translateJobFields(q.en);
          return { ...q, nl, fr, es };
        })
      );

      await QuizModel.insertMany(translatedNew);
    }

    /** ------------------ UPDATE EXISTING QUIZZES ------------------ **/
    for (const q of existingQuizzes) {
      const existingQuiz = (await QuizModel.findById(q._id)) as any;

      if (!existingQuiz) continue; // skip invalid IDs

      const updatedEn = {
        question: q?.question,
        option_A: q?.option_A,
        option_B: q?.option_B,
        option_C: q?.option_C,
        option_D: q?.option_D,
      } as any;

      // Check if English text changed → re-translate
      const hasChanged =
        existingQuiz?.en?.question !== updatedEn?.question ||
        existingQuiz?.en?.option_A !== updatedEn?.option_A ||
        existingQuiz?.en?.option_B !== updatedEn?.option_B ||
        existingQuiz?.en?.option_C !== updatedEn?.option_C ||
        existingQuiz?.en?.option_D !== updatedEn?.option_D;

      let translations = {};
      if (hasChanged) {
        const { nl, fr, es } = await translateJobFields(updatedEn);
        translations = { nl, fr, es };
      }

      await QuizModel.findByIdAndUpdate(
        q._id,
        {
          $set: {
            taskId,
            en: updatedEn,
            questionNumber: q.questionNumber,
            answer: q.answer,
            ...translations, // overwrite translations if needed
          },
        },
        { new: true }
      );
    }

    return task;
  },

  async deleteQuiz(payload: any) {
    const { quizId } = payload;

    if (!quizId) {
      throw new Error("Quiz id is required");
    }

    const taskData = await QuizModel.findById(quizId).populate("taskId").lean();

    await QuizModel.findByIdAndDelete(quizId);

    return taskData?.taskId;
  },

  async addCheckbox(payload: any) {
    const { taskId, checkbox } = payload;

    const task = await TaskModel.findById(taskId);

    if (!task) {
      throw new Error("taskNotFound");
    }

    if (checkbox.length === 0) {
      throw new Error("Please add data in checkbox");
    }

    await CheckboxModel.findOneAndDelete({ taskId });

    const { nl, fr, es } = await translateJobFields({ ...checkbox });

    await CheckboxModel.create({
      en: { ...checkbox },
      nl,
      fr,
      es,
      taskId,
    });

    return task;
  },
};

export const userServices = {
  async getUsers(payload: any) {
    let { page = 1, limit = 10, search, sort = null, country = null } = payload;

    page = Number(page);
    limit = Number(limit);

    const matchStage: any = { isDeleted: false };

    if (search) {
      matchStage.fullName = { $regex: search, $options: "i" };
    }

    if (country) {
      matchStage.country = country;
    }

    const skip = (page - 1) * limit;

    const usersAgg = await UserModel.aggregate([
      { $match: matchStage },

      // Join applied jobs
      {
        $lookup: {
          from: "appliedjobs",
          localField: "_id",
          foreignField: "userId",
          as: "appliedJobs",
        },
      },

      // Join transactions
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "userId",
          as: "transactions",
        },
      },

      // Join subscriptions (based on userId)
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "userId",
          as: "subscriptions",
        },
      },

      // Join plan from subscriptions.planId
      {
        $lookup: {
          from: "plans",
          localField: "subscriptions.planId",
          foreignField: "_id",
          as: "planDocs",
        },
      },

      // Add computed fields
      {
        $addFields: {
          jobAppliedCount: { $size: "$appliedJobs" },
          totalAmountPaid: {
            $sum: {
              $map: {
                input: "$transactions",
                as: "t",
                in: "$$t.amount",
              },
            },
          },
          currency: {
            $ifNull: [{ $arrayElemAt: ["$transactions.currency", 0] }, ""],
          },
          subscriptionPlan: {
            $ifNull: [
              { $arrayElemAt: ["$planDocs.name.en", 0] }, // <-- English name
              "",
            ],
          },
        },
      },

      // Shape final output
      {
        $project: {
          _id: 1,
          fullName: 1,
          country: 1,
          subscriptionPlan: 1,
          jobAppliedCount: 1,
          totalAmountPaid: 1,
          currency: 1,
          createdAt: 1,
        },
      },

      // Sorting
      ...(sort === "jobHighToLow"
        ? [{ $sort: { jobAppliedCount: -1 } as any }]
        : sort === "jobLowToHigh"
        ? [{ $sort: { jobAppliedCount: 1 } as any }]
        : [{ $sort: { createdAt: -1 } as any }]),

      // Pagination
      { $skip: skip },
      { $limit: limit },
    ]);

    // Count total users (without pagination)
    const total = await UserModel.countDocuments(matchStage);

    return {
      users: usersAgg,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserById(payload: any) {
    const { userId } = payload;

    const userData = await UserModel.findById(userId)
      .select("fullName email image phone country")
      .lean();

    const subscription = await SubscriptionModel.findOne({
      userId: userData?._id,
    })
      .select("nextBillingDate status amount planId currency")
      .lean();

    // const subscriptionName = await planModel
    //   .findById(subscription?.planId)
    //   .lean();

    const subscriptionName =
      process.env.PAYMENT === "DEV"
        ? testPlanModel.findById(subscription?.planId).lean()
        : (planModel.findById(subscription?.planId).lean() as any);

    const userMoreData = await UserInfoModel.findOne({ userId })
      .select(
        "measurements portfolioImages links videos gender dob setCards aboutMe"
      )
      .lean();

    const appliedJobs = (await AppliedJobModel.find({ userId })
      .populate("jobId", "en date time")
      .lean()) as any;

    const formatted = appliedJobs.map((job: any) => ({
      ...job,
      ...job?.jobId?.en, // spread nested "en" fields
      jobId: job.jobId?._id, // keep only jobId reference if needed
    })) as any;

    const transactions = await TransactionModel.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId), amount: { $gt: 0 } },
      },
      // Lookup subscription by stripeSubscriptionId
      {
        $lookup: {
          from: "subscriptions", // collection name in MongoDB
          localField: "stripeSubscriptionId",
          foreignField: "stripeSubscriptionId",
          as: "subscription",
        },
      },
      { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },
      // Lookup plan using subscription.planId
      {
        $lookup: {
          from: "plans", // collection name in MongoDB
          localField: "subscription.planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          amount: 1,
          currency: 1,
          paidAt: 1,
          status: 1,
          planName: "$plan.name.en", // get English plan name
          planKey: "$plan.key",
        },
      },
      { $sort: { paidAt: -1 } }, // latest first
    ]);

    const tasks = await TaskResponseModel.find({ userId })
      .populate("taskId")
      .select("taskReviewed adminReviewed taskNumber milestone rating")
      .sort({ taskNumber: 1 })
      .lean();

    const formattedTask = tasks.map((val: any) => ({
      reviewed: val.adminReviewed,
      number: val.taskNumber,
      milestone: val.milestone,
      rating: val.rating,
      title: val.taskId.en.title,
      _id: val._id,
    }));

    const groupedByMilestone: any[] = [];

    formattedTask.forEach((task) => {
      const index = task.milestone - 1; // assuming milestone starts from 1
      if (!groupedByMilestone[index]) groupedByMilestone[index] = [];
      groupedByMilestone[index].push(task);
    });

    return {
      ...userData,
      ...userMoreData?.measurements,
      bio: userMoreData?.aboutMe,
      gender: userMoreData?.gender,
      dob: userMoreData?.dob,
      currentPlan: { ...subscription, name: subscriptionName?.name?.en },
      images: {
        setCards: userMoreData?.setCards,
        images: userMoreData?.portfolioImages,
      },
      videos: userMoreData?.videos,
      socialLinks: userMoreData?.links,
      transactions,
      appliedJobs: formatted,
      tasks: groupedByMilestone,
    };
  },

  async getAllTaskResponse(payload: any) {
    let { page = 1, limit = 50, search = "", sortOrder = "newToOld" } = payload;
    page = Number(page);
    limit = Number(limit);

    const sortStage =
      sortOrder === "oldToNew" ? { createdAt: 1 } : { createdAt: -1 };

    const pipeline: any[] = [
      {
        $match: {
          adminReviewed: false,
        },
      },
      {
        $lookup: {
          from: "users", // name of your users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: search
          ? {
              "user.fullName": { $regex: search, $options: "i" },
            }
          : {},
      },
      {
        $project: {
          createdAt: 1,
          milestone: 1,
          taskNumber: 1,
          appReview: 1,
          "user.fullName": 1,
        },
      },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const allTasks = await TaskResponseModel.aggregate(pipeline);

    // Total count for pagination
    const totalCountPipeline = [
      {
        $match: { adminReviewed: false },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: search
          ? {
              "user.fullName": { $regex: search, $options: "i" },
            }
          : {},
      },
      { $count: "total" },
    ];

    const totalResult = await TaskResponseModel.aggregate(totalCountPipeline);
    const totalCount = totalResult[0]?.total || 0;

    return {
      data: allTasks,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  async getUserTaskResponse(payload: any) {
    const { taskId } = payload;
    const data = await TaskResponseModel.findById(taskId).lean();
    return data;
  },

  async submitTaskResponse(payload: any) {
    const { taskId, rating } = payload;

    const taskData = (await TaskResponseModel.findById(taskId)
      .populate("userId")
      .lean()) as any;

    if (!taskData) {
      throw new Error("Task not present");
    }

    if (rating === 0) {
      await TaskResponseModel.findByIdAndDelete(taskId);
      await NotificationService(
        [taskData.userId],
        "TASK_REJECTED",
        taskId,
        taskData.taskNumber
      );
      return taskData.taskNumber;
    }

    await TaskResponseModel.findByIdAndUpdate(taskId, {
      $set: { rating, taskReviewed: true, adminReviewed: true },
    });

    await NotificationService(
      [taskData.userId],
      "TASK_COMPLETED",
      taskId,
      taskData.taskNumber
    );

    const nextTask = await TaskModel.findOne({
      taskNumber: (taskData?.taskNumber || 0) + 1,
    }).lean();

    if (
      nextTask &&
      taskData?.userId?.currentMilestone &&
      taskData?.userId?.currentMilestone !== nextTask?.milestone
    ) {
      await UserModel.findByIdAndUpdate(taskData.userId._id, {
        $set: { currentMilestone: nextTask.milestone },
      });

      await NotificationService(
        [taskData.userId],
        "MILESTONE_UNLOCKED",
        nextTask._id
      );
    }

    return taskData.taskNumber;
  },
};
