import { configDotenv } from "dotenv";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info";
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
    return {
      milestone: 0,
      percentage: 0,
      tasks: 0,
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
    const { type, planId, userData } = payload;
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
          status: { $or: ["active", "trialing"] },
        },
        {
          $set: {
            status: "canceling",
          },
        }
      );
    }

    if (type == "cancelTrial") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        {
          trial_end: "now",
          proration_behavior: "none",
        }
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
        }
      );
    }

    return {};
  },
};
