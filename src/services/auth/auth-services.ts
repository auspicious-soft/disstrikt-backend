import { OtpModel } from "src/models/system/otp-schema";
import { UserModel } from "src/models/user/user-schema";
import {
  generateAndSendOtp,
  generateToken,
  hashPassword,
  verifyPassword,
} from "src/utils/helper";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
import { UserInfoModel } from "src/models/user/user-info";
import { planModel } from "src/models/admin/plan-schema";
import stripe from "src/config/stripe";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { TokenModel } from "src/models/user/token-schema";
import { AdminModel } from "src/models/admin/admin-schema";

configDotenv();

export const authServices = {
  async register(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
    });
    if (checkExist) {
      throw new Error("emailExist");
    }

    payload.password = await hashPassword(payload.password);
    const userData = await UserModel.create(payload);
    const user = userData.toObject();
    delete user.password;

    if (payload.authType === "EMAIL") {
      await generateAndSendOtp(
        payload.email,
        "SIGNUP",
        "EMAIL",
        payload.language,
        "USER"
      );
    }

    return user;
  },

  async verifyOtp(payload: any) {
    const checkExist = await OtpModel.findOne({
      $or: [{ email: payload.value }, { phone: payload.value }],
      code: payload.otp,
      userType: payload.userType,
    });

    if (!checkExist) {
      throw new Error("invalidOtp");
    }

    const verificationMode = checkExist.email ? "email" : "phone";
    const verificationKey = checkExist.email
      ? "isVerifiedEmail"
      : "isVerifiedPhone";

    const userData = await UserModel.findOneAndUpdate(
      { [verificationMode]: payload.value },
      { $set: { [verificationKey]: true } },
      { new: true }
    );

    if (!userData) {
      throw new Error("userNotFound");
    }

    await UserInfoModel.create({
      userId: userData._id,
      measurements: {
        heightCm: null,
        bustCm: null,
        waistCm: null,
        hipsCm: null,
        weightKg: null,
        shoeSizeUK: null,
      },
    });

    const token = await generateToken(userData);
    const user = userData.toObject();
    delete user.password;

    return { ...user, token };
  },

  async resendOtp(payload: any) {

    if(payload.userType == "USER"){
      const checkExist = await UserModel.findOne({
        $or: [{ email: payload.value }, { phone: payload.value }],
        isVerifiedEmail: false,
        isVerifiedPhone: false,
      });

      if (!checkExist) {
        throw new Error("registerAgain");
      }
    }

    await generateAndSendOtp(
      payload.value,
      payload.purpose,
      "EMAIL",
      payload.language,
      payload.userType
    );
    return {};
  },

  async login(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      authType: "EMAIL",
    });

    if (!checkExist) {
      throw new Error("userNotFound");
    }

    if (!checkExist?.isVerifiedEmail) {
      // throw new Error("emailNotVerified");
      await generateAndSendOtp(
        checkExist.email,
        "SIGNUP",
        "EMAIL",
        checkExist.language ?? "en",
        "USER"
      );

      return checkExist;
    }

    const passwordStatus = await verifyPassword(
      payload.password,
      checkExist?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }

    checkExist.fcmToken = payload.fcmToken;
    checkExist.save();

    const subscription = await SubscriptionModel.findOne({
      userId: checkExist._id,
    });

    const token = await generateToken(checkExist);
    const userObj = checkExist.toObject();
    delete userObj.password;
    return { ...userObj, token, subscription: subscription?.status || null };
  },

  async forgetPassword(payload: any) {
    const admin = payload?.admin || false;

    const checkExist = admin
      ? await AdminModel.findOne({
          email: payload.email,
          authType: "EMAIL",
        })
      : await UserModel.findOne({
          email: payload.email,
          isVerifiedEmail: true,
          authType: "EMAIL",
        });

    if (!checkExist) {
      throw new Error("userNotFound");
    }

    await generateAndSendOtp(
      payload.email,
      "FORGOT_PASSWORD",
      "EMAIL",
      payload?.language || "en",
      admin ? "ADMIN" : "USER"
    );
    return {};
  },

  async verifyForgetPassOtp(payload: any) {
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: payload.value }, { phone: payload.value }],
      code: payload.otp,
      userType: payload.userType,
    });
    if (!checkOtp) {
      throw new Error("invalidOtp");
    }
    const tokenPayload = checkOtp.toObject();
    const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET as string, {
      expiresIn: "5m",
    });

    return { token };
  },

  async resetPassword(payload: any) {
    const data = jwt.verify(
      payload.token,
      process.env.AUTH_SECRET as string
    ) as any;
    if (!data.email && !data.phone) {
      throw new Error();
    }
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: data?.email }, { phone: data?.phone }],
      code: data.code,
      purpose: "FORGOT_PASSWORD",
      userType: data.userType,
    });
    if (!checkOtp) {
      throw new Error();
    }

    const password = await hashPassword(payload.password);

    if (data?.userType === "ADMIN") {
      await AdminModel.updateOne({ email: data.email }, { $set: { password } });
    } else {
      await UserModel.updateOne({ email: data.email }, { $set: { password } });
    }

    return {};
  },

  async userMoreInfo(payload: any) {
    const { measurements, gender, dob, userData } = payload;
    const checkUser = await UserModel.findOne({
      _id: userData.id,
      isVerifiedEmail: true,
    });
    if (!checkUser) {
      throw new Error("userNotFound");
    }
    const data = await UserInfoModel.findOneAndUpdate(
      {
        userId: checkUser._id,
      },
      {
        $set: {
          measurements,
          gender,
          dob,
        },
      },
      { new: true }
    );

    checkUser.isUserInfoComplete = true;
    await checkUser.save();

    return data;
  },

  async getPlans(payload: any) {
    const { language } = payload;

    const plans = await planModel.find({ isActive: true }).lean();

    const translatedPlans = plans?.map((plan: any) => {
      return {
        name: plan.name?.[language] || plan.name?.en,
        description: plan.description?.[language] || plan.description?.en,
        features: plan.features?.map(
          (feature: any) => feature?.[language] || feature?.en
        ),
        trialDays: plan.trialDays,
        gbpAmount: plan.unitAmounts.eur / 100,
        eurAmount: plan.unitAmounts.gbp / 100,
        currency: Object.keys(plan.stripePrices),
        _id: plan?._id,
      };
    });

    return translatedPlans;
  },

  async setupIntent(payload: any) {
    const { language, country, fullName, email, id, phone } = payload;
    let customer;
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: fullName,
        phone: phone,
        metadata: {
          userId: id,
          country: country,
          language: language,
        },
      });
    }

    await UserModel.updateOne(
      { _id: id },
      { $set: { stripeCustomerId: customer.id } }
    );

    // ✅ Check if card already saved
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });

    if (paymentMethods.data.length > 0) {
      return {
        alreadySetup: true,
        customerId: customer.id,
        paymentMethodId: paymentMethods.data[0].id,
      };
    }

    // ❌ No saved card — create new SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
    });

    return {
      alreadySetup: false,
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    };
  },

  async buyPlan(payload: any) {
    const { planId, currency, id, paymentMethodId } = payload;

    const plans = await planModel
      .findOne({ _id: planId, isActive: true })
      .lean();

    if (!plans) {
      throw new Error("planNotFound");
    }

    const stripeProduct = await stripe.products.retrieve(plans.stripeProductId);

    if (!stripeProduct) {
      throw new Error("planNotFound");
    }

    const priceList = await stripe.prices.list({
      product: stripeProduct.id,
      active: true, // only get active prices
      limit: 10,
    });

    const productPrice = priceList?.data?.find(
      (price) => price.currency === currency
    );

    if (!productPrice) {
      throw new Error("invalidCurrency");
    }

    const user = await UserModel.findById(id);

    if (!user?.stripeCustomerId) {
      throw new Error("stripeCustomerIdNotFound");
    }

    if (user.hasUsedTrial && plans.trialDays > 0) {
      throw new Error("userAlreadyUsedTrial");
    }

    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: productPrice.id }],
      trial_period_days: plans.trialDays,
      default_payment_method: paymentMethodId,
      expand: ["latest_invoice.payment_intent"],
    });

    user.hasUsedTrial = true;
    user.isCardSetupComplete = true;
    await user.save();

    // Convert Unix timestamps to Date objects
    const trialStart = subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null;
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;
    const startDate = new Date(subscription.start_date * 1000);
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    const nextBillingDate = currentPeriodEnd;

    // Save to DB
    await SubscriptionModel.create({
      userId: id,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      planId,
      paymentMethodId,
      status: subscription.status,
      trialStart,
      trialEnd,
      startDate,
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate,
      amount: subscription.items.data[0].price.unit_amount,
      currency: subscription.currency,
    });

    return {
      subscriptionId: subscription.id,
    };
  },

  async getLoginResponse(payload: any) {
    const { userId } = payload;
    const user = await UserModel.findById(userId).select("-password -__v");
    const subscription = await SubscriptionModel.findOne({
      userId: userId,
    });
    return { ...user?.toObject(), subscription: subscription?.status || null };
  },
  async logoutUser(payload: any) {
    const { userId } = payload;
    const user = await UserModel.findById(userId);
    await TokenModel.findOneAndDelete({
      userId: userId,
    });

    if (user) {
      user.fcmToken = null;
      await user.save();
    }

    return {};
  },

  // admin auth services

  async adminLogin(payload: any) {
    const checkExist = await AdminModel.findOne({
      email: payload.email,
      authType: "EMAIL",
    }).lean();

    if (!checkExist) {
      throw new Error("userNotFound");
    }

    const passwordStatus = await verifyPassword(
      payload.password,
      checkExist?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }
    delete checkExist.password;
    return checkExist;
  },
};
