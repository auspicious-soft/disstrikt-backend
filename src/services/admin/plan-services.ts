import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { features, regionalAccess } from "src/utils/constant";

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
};
