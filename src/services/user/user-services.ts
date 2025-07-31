import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { deleteFileFromS3 } from "src/config/s3";
import stripe from "src/config/stripe";
import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";
import { JobModel } from "src/models/admin/jobs-schema";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { UserModel } from "src/models/user/user-schema";
import { genders, languages } from "src/utils/constant";
import { generateToken, hashPassword, verifyPassword } from "src/utils/helper";

configDotenv();

export const homeServices = {
  getUserHome: async (payload: any) => {
    return {
      plan: payload.userData.subscription.planName || null,
      milestone: 0,
      percentage: 0,
      tasks: [],
    };
  },
};

export const profileServices = {
  profile: async (payload: any) => {
    const { userData } = payload;
    return {
      fullName: userData.fullName,
      id: userData.id,
      image: userData.image,
      authType: userData.authType,
      milestone: 0,
      percentage: 0,
      taskCount: 0,
      appliedJobs: 0,
      selectedJobs: 0,
    };
  },

  getUser: async (payload: any) => {
    const { fullName, phone, email, countryCode, image } = payload.userData;
    const additionalInfo = await UserInfoModel.findOne({
      userId: payload.userData.id,
    }).lean();

    const { dob, gender, measurements } = additionalInfo || {};

    return {
      _id: payload.userData.id,
      image,
      fullName,
      phone,
      email,
      countryCode,
      dob,
      gender,
      measurements,
      genders: genders,
    };
  },

  updateUser: async (payload: any) => {
    if (payload.image) {
      const data = await UserModel.findById(payload.id).lean();
      if (data && data.image) {
        await deleteFileFromS3(data?.image as string);
      }
    }
    const userInfo = await UserInfoModel.findOneAndUpdate(
      { userId: payload.id },
      {
        $set: {
          measurements: {
            heightCm: payload?.heightCm,
            bustCm: payload?.bustCm,
            waistCm: payload?.waistCm,
            hipsCm: payload?.hipsCm,
            weightKg: payload?.weightKg,
            shoeSizeUK: payload?.shoeSizeUK,
          },
          gender: payload?.gender,
          dob: payload?.dob,
        },
      },
      { new: true }
    ).lean();

    const user = await UserModel.findByIdAndUpdate(
      payload.id,
      {
        $set: {
          fullName: payload?.fullName,
          image: payload?.image,
        },
      },
      { new: true }
    ).lean();

    return {
      _id: payload.id,
      image: user?.image || "",
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      email: user?.email || "",
      countryCode: user?.countryCode || "",
      dob: userInfo?.dob || "",
      gender: userInfo?.gender || "",
      measurements: userInfo?.measurements || {},
      genders: genders,
    };
  },

  changePassword: async (payload: any) => {
    const { id, oldPassword, newPassword, language } = payload;

    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("userNotFound");
    }

    const passwordStatus = await verifyPassword(
      oldPassword,
      user?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }

    const updatedPassword = await hashPassword(newPassword);
    user.password = updatedPassword;
    await user.save();

    return {};
  },

  changeLanguage: async (payload: any) => {
    const { id, language } = payload;
    await UserModel.findByIdAndUpdate(
      id,
      { $set: { language } },
      { new: true }
    );
    return {};
  },

  changeCountry: async (payload: any) => {
    const { id, country } = payload;
    await UserModel.findByIdAndUpdate(id, { $set: { country } });
    return {};
  },

  updatePlan: async (payload: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const toDate = (timestamp?: number | null): Date | null =>
        typeof timestamp === "number" && !isNaN(timestamp)
          ? new Date(timestamp * 1000)
          : null;

      const { type, planId, userData } = payload;
      const { stripeCustomerId, currency, paymentMethodId, status } =
        userData.subscription;

      if (type == "cancelTrial" && status !== "trialing") {
        throw new Error("Your subscription is not Trailing");
      }
      if (type == "cancelSubscription") {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          }
        );

        await SubscriptionModel.findOneAndUpdate(
          {
            userId: userData.id,
            $or: [{ status: "active" }, { status: "trialing" }],
          },
          {
            $set: {
              status: "canceling",
            },
          },
          { session }
        );
      }

      if (type == "cancelTrial" && !planId) {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            trial_end: "now",
            proration_behavior: "none",
          }
        );
      }
      if (type == "cancelTrial" && planId) {
        await stripe.subscriptions.cancel(
          userData.subscription.stripeSubscriptionId
        );

        await SubscriptionModel.findByIdAndDelete(userData.subscription._id, {
          session,
        });
        const planData = await planModel.findById(planId).session(session);
        const newSub = await stripe.subscriptions.create({
          customer:
            typeof stripeCustomerId === "string"
              ? stripeCustomerId
              : stripeCustomerId?.id ?? "",
          items: [{ price: planData?.stripePrices[currency as "eur" | "gbp"] }],
          default_payment_method: paymentMethodId,
          expand: ["latest_invoice.payment_intent"],
        });

        const newSubPrice = newSub.items.data[0]?.price;

        await SubscriptionModel.create(
          [
            {
              userId: userData.id,
              stripeCustomerId,
              planId,
              stripeSubscriptionId: newSub.id,
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
            },
          ],
          { session }
        );
      }

      if (type == "upgrade") {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          }
        );

        await SubscriptionModel.findOneAndUpdate(
          {
            userId: userData.id,
          },
          {
            $set: {
              nextPlanId: planId,
            },
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
      return {};
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("badrequest");
    }
  },
};

export const portfolioServices = {
  userPortfolio: async (payload: any) => {
    const { userData } = payload;
    const portfolio = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const {
      aboutMe,
      portfolioImages,
      links,
      videos,
      setCards,
      _id,
      measurements,
      gender,
      dob,
    } = portfolio as any;

    const response = {
      userId: userData.id,
      _id,
      fullName: userData.fullName,
      image: userData.image,
      aboutMe,
      portfolioImages,
      links: links.length
        ? links
        : [
            {
              platform: "Instagram",
              url: "",
            },
            {
              platform: "Youtube",
              url: "",
            },
          ],
      videos,
      setCards,
      portfolioLink: `http://localhost:3000/${userData?.id}`,
      videoSections: ["introVideo", "catwalkVideo", "other"],
      measurements,
      gender,
      dob,
      country: userData.country,
      email: userData.email,
      phone: userData.phone,
    };

    return response;
  },

  updatePortfolio: async (payload: any) => {
    const { userData, data } = payload;

    const updateData = await UserInfoModel.findOneAndUpdate(
      { userId: userData.id },
      {
        aboutMe: data.aboutMe,
        links: data.links,
        setCards: data.setCards,
      },
      { new: true }
    );

    const response = {
      userId: userData.id,
      _id: updateData?._id,
      fullName: userData.fullName,
      image: userData.image,
      aboutMe: updateData?.aboutMe,
      portfolioImages: updateData?.portfolioImages,
      links: updateData?.links.length
        ? updateData.links
        : [
            {
              platform: "Instagram",
              url: "",
            },
            {
              platform: "Youtube",
              url: "",
            },
          ],
      videos: updateData?.videos,
      setCards: updateData?.setCards,
      portfolioLink: `http://localhost:3000/${userData?.id}`,
      videoSections: ["introVideo", "catwalkVideo", "other"],
    };

    return response;
  },

  addVideo: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    checkExist?.videos?.map((info) => {
      if (info.title === data.title) {
        throw new Error("sectionExist");
      }
    });

    checkExist?.videos.push({ title: data.title, url: data.url });

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { videos: checkExist?.videos },
    });

    return {};
  },

  addImage: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const images = [...data.url, ...(checkExist?.portfolioImages || [])];

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: images },
    });

    return {};
  },

  deleteVideo: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const udpateData = checkExist?.videos?.filter(
      (val: any) => val.url !== data.url
    );

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { videos: udpateData },
    });

    // ************************ Need to write code to remove video from S3 *************************

    await deleteFileFromS3(data.url);

    return {};
  },

  deleteImage: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    let newData = checkExist?.portfolioImages || [];

    for (let i = 0; i < data.url.length; i++) {
      newData = newData?.filter((val) => val !== data.url[i]);
    }

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: newData },
    });

    // ************************ Need to write code to remove image from S3 *************************

    for (const url of data.url) {
      await deleteFileFromS3(url);
    }

    return {};
  },
};

export const userJobServices = {
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
      type = "NEW",
      userId,
    } = payload;

    const filter: any = {};
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    if (country) filter.countryCode = country;

    if (search) {
      filter.$or = [
        { [`${language}.title`]: { $regex: search, $options: "i" } },
        { [`${language}.companyName`]: { $regex: search, $options: "i" } },
      ];
    }

    if (branch) filter[`en.branch`] = branch;
    if (gender) filter[`en.gender`] = gender;

    if (age) {
      const ageNumber = parseInt(age as string, 10);
      if (!isNaN(ageNumber)) {
        filter.minAge = { $lte: ageNumber };
        filter.maxAge = { $gte: ageNumber };
      }
    }

    let appliedJobMap = new Map<string, string>();

    if (userId && type === "APPLIED") {
      const appliedJobs = await AppliedJobModel.find({ userId });
      const appliedJobIds = appliedJobs.map((j) => j.jobId);
      appliedJobMap = new Map(
        appliedJobs.map((j) => [j.jobId.toString(), j.status])
      );
      filter._id = { $in: appliedJobIds };
    } else if (userId && type === "NEW") {
      const appliedJobs = await AppliedJobModel.find({ userId });
      const appliedJobIds = appliedJobs.map((j) => j.jobId);
      filter._id = { $nin: appliedJobIds };
    }

    // Sorting
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

    // Fetch jobs
    const totalJobs = await JobModel.countDocuments(filter);
    const rawJobs = await JobModel.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    const jobs = rawJobs.map((job: any) => {
      const jobObj = job.toObject();
      const langFields = jobObj[language] || {};
      // remove other languages
      languages?.forEach((langKey) => delete jobObj[langKey]);

      const base = {
        ...jobObj,
        ...langFields,
      };

      // Add application status only for applied jobs
      if (type === "APPLIED") {
        base.status = appliedJobMap.get(jobObj._id.toString()) || "PENDING";
      }

      base.type = type;
      return base;
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

  applyJobs: async (payload: any) => {
    const { jobId, id, gender } = payload;

    const isJobExpired = (jobDate: Date): boolean => {
      const now = new Date(); // current time in UTC
      return now > jobDate;
    };

    //*********************
    //Will call validation helpers based on users plan later.
    //*********************

    const checkApplication = await AppliedJobModel.findOne({
      jobId,
      userId: id,
    });
    const checkJob = await JobModel.findById(jobId).lean();

    if (!checkJob) {
      throw new Error("Invalid job Id");
    }
    if (checkApplication) {
      throw new Error("requestAlreadyExist");
    }

    if (checkJob?.en?.gender !== gender) {
      throw new Error("invalidGender");
    }

    if (isJobExpired(checkJob?.date || new Date())) {
      throw new Error("jobExpired");
    } else {
      await JobModel.updateOne(
        { _id: jobId },
        { $addToSet: { appliedUsers: id } } // avoids duplicates
      );
      await AppliedJobModel.create({
        jobId,
        userId: id,
      });
      return {};
    }
  },

  getJobById: async (payload: any) => {
    const { jobId, language } = payload;

    const data = (await JobModel.findById(jobId).lean()) as any;

    const response = {
      ...data[language],
      minAge: data.minAge,
      maxAge: data.maxAge,
      date: data.date,
      time: data.time,
      pay: data.pay,
      currency: data.currency,
      countryCode: data.countryCode,
      appliedUsers: data.appliedUsers,
    };

    return response;
  },
};
