import { Request } from "express";
import mongoose, { Types } from "mongoose";
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
import { translateJobFields } from "src/utils/helper";
import { Stripe } from "stripe";
import { Parser } from "json2csv";
import { userMoreInfo } from "src/controllers/auth/auth-controller";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { TaskResponseModel } from "src/models/admin/task-response";

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
    const toDate = (timestamp?: number | null): Date | null =>
      typeof timestamp === "number" && !isNaN(timestamp)
        ? new Date(timestamp * 1000)
        : null;

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
            { stripeCustomerId, stripeSubscriptionId },
            { $set: updateData },
            { upsert: false }
          );
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

          if (nextPlanId) {
            await SubscriptionModel.findByIdAndDelete(_id);
            const planData = await planModel.findById(nextPlanId);
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
          } else {
            await stripe.paymentMethods.detach(paymentMethodId);
            await TokenModel.findOneAndDelete({
              userId,
            });
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

          const pi =
            typeof invoice.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice?.payment_intent;

          // Retrieve charge
          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }

          const card = charge?.payment_method_details?.card;

          const lineItem = invoice?.lines?.data?.[0];
          const period = lineItem?.period;

          const currentPeriodStart = period?.start
            ? new Date(period.start * 1000)
            : null;

          const currentPeriodEnd = period?.end
            ? new Date(period.end * 1000)
            : null;

          const nextBillingDate = currentPeriodEnd; // Same as currentPeriodEnd

          // Update SubscriptionModel with billing cycle info
          await SubscriptionModel.findOneAndUpdate(
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            {
              $set: {
                currentPeriodStart,
                currentPeriodEnd,
                nextBillingDate,
              },
            }
          );

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

          const subscriptionId = existing?.stripeSubscriptionId as string;

          if (!existing) break;

          const userId = existing.userId;
          const pi =
            typeof invoice?.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice.payment_intent;

          // Retrieve the charge using the payment intent id
          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }
          const card = charge?.payment_method_details?.card;

          await SubscriptionModel.updateOne(
            { stripeSubscriptionId: subscriptionId },
            { $set: { status: "past_due" } }
          );

          await TransactionModel.create({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            invoiceId: invoice.id,
            paymentIntentId: pi?.id,
            status: "failed",
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
            errorMessage: pi?.last_payment_error?.message ?? "Unknown failure",
            paidAt: new Date(),
          });

          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          // Only process subscription checkouts
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
          const userId = session.metadata?.userId; // You should send this when creating session
          const planId = session.metadata?.planId;

          await SubscriptionModel.findOneAndDelete({ userId });
          await UserModel.findByIdAndUpdate(userId, { hasUsedTrial: true });
          await SubscriptionModel.create({
            userId,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            planId,
            paymentMethodId: paymentMethodId,
            status: subscription.status,
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
      }

      console.log("✅ Successfully handled event:", event.type);
      return {};
    } catch (err: any) {
      console.error("***STRIPE EVENT FAILED***", err.message);
      return {};
    }
  },
};

export const jobServices = {
  async createJob(payload: any) {
    const { en, date, time, ...restData } = payload;

    // Function to translate the language of jobs
    const result = await translateJobFields(payload.en);
    const { nl, fr, es } = result;

    const jobDateTimeUTC = new Date(date);
    jobDateTimeUTC.setUTCHours(time, 0, 0, 0);

    const createdJob = await JobModel.create({
      en,
      nl,
      fr,
      es,
      ...restData,
      date: jobDateTimeUTC,
      time,
    });

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

  async updateJobStatus(payload: any) {
    const { status, jobId } = payload;
    await AppliedJobModel.findOneAndUpdate({ jobId }, { $set: { status } });

    //PUSH_NOTIFICATION
    //PUSH_NOTIFICATION
    //PUSH_NOTIFICATION

    return {};
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
    return {};
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

    if (link.length) {
      if (task?.link?.length) {
        await Promise.all(
          task.link.map((data: string) => deleteFileFromS3(data))
        );
      }

      task.link = data.link;
    }

    task.save();

    return task;
  },

  async getTasks(payload: any) {
    const page = Number(payload.page) || 1;
    const limit = Number(payload.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await TaskModel.aggregate([
      {
        $match: {
          isActive: true,
        },
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
                    { $eq: ["$taskReviewed", true] },
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

    return { success: true };
  },

  async deleteQuiz(payload: any) {
    const { quizId } = payload;

    if (!quizId) {
      throw new Error("Quiz id is required");
    }

    await QuizModel.findByIdAndDelete(quizId);
    return {};
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

    return {};
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

    const userMoreData = await UserInfoModel.findOne({ userId })
      .select("measurements portfolioImages links videos gender dob setCards")
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
        $match: { userId: new Types.ObjectId(userId) },
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
      .select("taskReviewed taskNumber milestone rating")
      .sort({ taskNumber: 1 })
      .lean();

    const formattedTask = tasks.map((val: any) => ({
      reviewed: val.taskReviewed,
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
      images: {
        setCards: userMoreData?.setCards,
        images: userMoreData?.portfolioImages,
      },
      socialLinks: userMoreData?.links,
      transactions,
      appliedJobs: formatted,
      tasks: groupedByMilestone,
    };
  },

  async getUserTaskResponse(payload: any) {
    const { taskId } = payload;
    const data = await TaskResponseModel.findById(taskId).lean();
    return data;
  },

  async submitTaskResponse(payload: any) {
    const { taskId, rating } = payload;

    const taskData = await TaskResponseModel.findById(taskId).populate("userId").lean() as any;

    if(!taskData){
      throw new Error("Task not present")
    }

    if (rating === 0) {
      await TaskResponseModel.findByIdAndDelete(taskId);
      return {};

      //PUSH_NOTIFICATION
      //PUSH_NOTIFICATION
      //PUSH_NOTIFICATION
    }

    await TaskResponseModel.findByIdAndUpdate(taskId, {
      $set: { rating, taskReviewed: true },
    });

    const nextTask = await TaskModel.findOne({
      taskNumber: (taskData?.taskNumber || 0) + 1,
    }).lean();

    if (
      nextTask &&
      taskData?.userId?.currentMilestone && taskData?.userId?.currentMilestone !== nextTask?.milestone
    ) {
      await UserModel.findByIdAndUpdate(taskData.userId._id, {
        $set: { currentMilestone: nextTask.milestone },
      });

      //PUSH_NOTIFICATION
      //PUSH_NOTIFICATION
      //PUSH_NOTIFICATION
      //PUSH_NOTIFICATION
    }

    return {};
  },
};
