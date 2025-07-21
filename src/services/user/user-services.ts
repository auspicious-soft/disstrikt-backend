import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { deleteFileFromS3 } from "src/config/s3";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { UserModel } from "src/models/user/user-schema";
import { genders } from "src/utils/constant";
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
    const userInfo = await UserInfoModel.findOneAndUpdate(
      { userId: payload.id },
      {
        $set: {
          measurements: {
            heightCm: payload?.heightCm,
            bustCm: payload?.bustCm,
            waistCm: payload?.waistCm,
            hipsCm: payload?.hipsCm,
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
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: { language } },
      { new: true }
    );
    let updatedToken;
    if (user) {
      updatedToken = await generateToken(user);
    }

    return { token: updatedToken || null };
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
        throw new Error("You subscription is not Trailing");
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

    const { aboutMe, portfolioImages, links, videos, setCards, _id } =
      portfolio as any;

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

    checkExist?.portfolioImages?.push(data.url);

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: checkExist?.portfolioImages },
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

    const udpateData = checkExist?.portfolioImages?.filter(
      (val) => val !== data.url
    );

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: udpateData },
    });

    // ************************ Need to write code to remove image from S3 *************************

    await deleteFileFromS3(data.url);

    return {};
  },
};
