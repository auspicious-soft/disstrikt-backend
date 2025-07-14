import { Request } from "express";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { features, regionalAccess } from "src/utils/constant";
import { Stripe } from "stripe";

export const planServices = {
  async getPlans(payload: any) {
    const plans = await planModel.find();
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
      eurAmount,
      gbpAmount,
      fullAccess,
      trialAccess,
      isActive,
    } = payload;

    const plan = await planModel.findById(planId);
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

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log(`***STRIPE EVENT TYPE***: ${event.type}`);

      const subscription = event.data.object as Stripe.Subscription;

      const toDate = (timestamp?: number | null): Date | null =>
        typeof timestamp === "number" && !isNaN(timestamp)
          ? new Date(timestamp * 1000)
          : null;

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const {
            id: stripeSubscriptionId,
            customer: stripeCustomerId,
            status,
            current_period_start,
            current_period_end,
            trial_start,
            trial_end,
            start_date,
            items,
            cancel_at_period_end,
          } = subscription;

          const planAmount = items.data[0]?.price?.unit_amount ?? 0;
          const currency = items.data[0]?.price?.currency ?? "inr";

          const updateData: any = {
            stripeCustomerId,
            stripeSubscriptionId,
            status: cancel_at_period_end ? "canceling" : status,
            startDate: toDate(start_date),
            trialStart: toDate(trial_start),
            trialEnd: toDate(trial_end),
            currentPeriodStart: toDate(current_period_start),
            currentPeriodEnd: toDate(current_period_end),
            nextBillingDate: toDate(current_period_end),
            amount: planAmount / 100,
            currency,
          };

          await SubscriptionModel.findOneAndUpdate(
            { stripeCustomerId },
            { $set: updateData },
            { upsert: false }
          );

          break;
        }

        case "customer.subscription.deleted": {
          const { customer: stripeCustomerId, currency } = subscription;

          const existingSub = await SubscriptionModel.findOne({
            stripeCustomerId,
          }).lean();

          if (!existingSub) {
            console.warn(
              "⚠️ No existing subscription found for deletion event."
            );
            return;
          }

          const { userId, nextPlanId, paymentMethodId } = existingSub;

          // Cancel current subscription in DB
          await SubscriptionModel.findOneAndUpdate(
            { stripeCustomerId },
            {
              $set: {
                status: "canceled",
                trialEnd: null,
                startDate: null,
                currentPeriodEnd: null,
                currentPeriodStart: null,
                nextBillingDate: null,
              },
            }
          );

          const planData = await planModel.findById(nextPlanId);

          // ⏭️ Handle Upgrade flow
          if (nextPlanId) {
            console.log("🔁 Upgrade triggered for next plan:", nextPlanId);

            const newSub = await stripe.subscriptions.create({
              customer:
                typeof stripeCustomerId === "string"
                  ? stripeCustomerId
                  : stripeCustomerId.id ?? "",
              items: [
                { price: planData?.stripePrices[currency as "eur" | "gbp"] },
              ],
              default_payment_method: paymentMethodId,
              expand: ["latest_invoice.payment_intent"],
            });

            const newSubPrice = newSub.items.data[0]?.price;

            await SubscriptionModel.create({
              userId,
              stripeCustomerId,
              stripeSubscriptionId: newSub.id,
              planId: nextPlanId,
              paymentMethodId,
              status: newSub.status,
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

            console.log(
              "✅ Upgrade flow completed and new subscription created."
            );
          }

          break;
        }

        // TODO: Add other events as needed, e.g., invoice.payment_succeeded, payment_failed, etc.
      }

      console.log("✅ Successfully handled event:", event.type);
      return {};
    } catch (err: any) {
      console.error("***STRIPE SIGNATURE FAILED***", err.message);
      return {};
    }
  },
};
