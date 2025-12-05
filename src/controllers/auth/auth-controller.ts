import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { testPlanModel } from "src/models/admin/test-plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserModel } from "src/models/user/user-schema";
import { authServices } from "src/services/auth/auth-services";
import { portfolioServices } from "src/services/user/user-services";
import { countries, languages } from "src/utils/constant";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import {
  AppStoreServerAPIClient,
  Environment,
  GetTransactionHistoryVersion,
  ReceiptUtility,
  Order,
  ProductType,
  HistoryResponse,
  TransactionHistoryRequest,
  // decodeTransaction,
} from "@apple/app-store-server-library";

import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";
import axios from "axios";
import { TransactionModel } from "src/models/user/transaction-schema";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      language,
      fullName,
      email,
      password,
      country,
      fcmToken,
      userType = "mobile",
    } = req.body;

    if (!fullName || !email || !password) {
      throw new Error("registerRequiredFields");
    }

    if (!languages.includes(language) || !countries.includes(country)) {
      throw new Error("invalidRegisterFields");
    }

    if (!fcmToken) {
      throw new Error("FCM is requird");
    }
    const blockedDomains = ["yopmail.com", "tempmail.com", "mailinator.com"];
    const emailDomain = email.split("@")[1]?.toLowerCase();
    // if(blockedDomains.includes(emailDomain)){
    //   throw new Error("invalidEmailDomain")
    // }

    await UserModel.findOneAndDelete({
      $or: [
        { email, isVerifiedEmail: false, isVerifiedPhone: false },
        {
          phone: req.body.phone,
          email,
          isVerifiedEmail: false,
          isVerifiedPhone: false,
        },
      ],
    });

    const response = await authServices.register({
      language,
      fullName,
      email,
      password,
      country,
      authType: "EMAIL",
      userType,
      fcmToken,
      ...req.body,
    });
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value, language } = req.body;
    if (!otp || !value || !language) {
      throw new Error("otp, value and language is required");
    }
    const response = await authServices.verifyOtp({
      otp,
      value,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { value, purpose, language } = req.body;
    if (!purpose || !value || !language) {
      throw new Error("otp, purpose and language is required");
    }
    const response = await authServices.resendOtp({
      purpose,
      value,
      userType: "USER",
      language,
    });
    return OK(res, response || {}, req.body.language || "en", "otpResent");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      fcmToken,
      language,
      userType = "mobile",
    } = req.body;
    if (!email || !password || !fcmToken || !language) {
      throw new Error("Email, language, Password & FCM is required");
    }
    const response = await authServices.login({
      email: email.toLowerCase(),
      password,
      fcmToken,
      userType,
      authType: "EMAIL",
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { authType, idToken, fcmToken, country, language, deviceType } =
      req.body;
    if (
      !authType ||
      !idToken ||
      !fcmToken ||
      !country ||
      !language ||
      !["GOOGLE", "APPLE"].includes(authType) ||
      !["ANDROID", "IOS"].includes(deviceType)
    ) {
      throw new Error(
        "idToken, fcmToken, country, language and Valid authType or deviceType is required"
      );
    }
    const response = await authServices.socialLogin({
      authType,
      idToken,
      fcmToken,
      country,
      language,
      deviceType,
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const forgetPassword = async (req: Request, res: Response) => {
  try {
    const { email, language } = req.body;
    if (!email || !language) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
      language,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const verifyResetPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value, language } = req.body;
    if (!value || !language || !otp) {
      throw new Error("Email, value and language is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      otp,
      value,
      language,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password, language } = req.body;
    if (!password || !language) {
      throw new Error("Email, value and language is required");
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      language,
      userType: "USER",
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const userMoreInfo = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;
    const { measurements, dob, gender } = req.body;
    // if (!measurements || !dob || !gender) {
    //   throw new Error("Measurements, DOB, and Gender is required");
    // }

    // if (!["MALE", "FEMALE"].includes(gender)) {
    //   throw new Error("Gender can be either MALE or FEMALE");
    // }

    const response = await authServices.userMoreInfo({
      measurements,
      dob,
      gender,
      userData: req.user,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;
    const response = await authServices.getPlans({
      language: userData.language,
      country: userData.country,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const setupIntent = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;

    const response = await authServices.setupIntent({
      language: userData.language,
      country: userData.country,
      ...userData,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const buyPlan = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;

    const {
      planId,
      currency,
      paymentMethodId,
      deviceType = null,
      receiptData,
      orderId,
    } = req.body;

    if (deviceType === "IOS") {
      const { originalTransactionId: orderId, ...restData } =
        (jwt.decode(receiptData) as any) || {};

      console.log("Decoded Receipt Data:", { orderId });

      const existing = await SubscriptionModel.findOne({ orderId });

      if (existing) {
        throw new Error("Subscription already exists");
      }

      // ❗ Create new clean subscription entry ONLY when it truly doesn't exist
      if (!existing) {
        await SubscriptionModel.create({
          userId: userData.id,
          orderId,
          deviceType: "IOS",
          status: "trialing", // temporary until webhook updates
        });
      }

      return OK(res, {}, req.body.language || "en", "loginSuccess");
    } else {
      if (!orderId && userData.userType === "mobile") {
        throw new Error("orderId is required");
      }

      if ((!planId || !currency) && userData.userType === "web") {
        throw new Error("planId, currency, and paymentMethodId is required");
      }

      if (planId) {
        userData.planId = planId;
      }

      const response = await authServices.buyPlan({
        language: userData.language,
        country: userData.country,
        userId: userData.id.toString(),
        planId,
        currency,
        userType: userData.userType,
        paymentMethodId,
        orderId,
        ...userData,
      });
      return OK(res, response || {}, req.body.language || "en", "loginSuccess");
    }
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getLoginResponse = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.getLoginResponse({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const buyAgain = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { planId } = req.body;
    const plan =
      process.env.PAYMENT === "DEV"
        ? await testPlanModel.findById(planId)
        : await planModel.findById(planId);
    if (!plan) {
      throw new Error("Invalid plan Id");
    }
    const response = await authServices.buyAgain({
      userId: userData.id,
      planId,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getActivePlan = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const response = await SubscriptionModel.findOne({
      userId: userData.id,
    }).lean();
    const data = { ...response, ...userData };
    return OK(res, data || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.logoutUser({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en", "logoutSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Admin Controllers

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("Email & Password required");
    }
    const response = await authServices.adminLogin({
      email,
      password,
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminForgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
      admin: true,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { value, otp } = req.body;
    if (!value) {
      throw new Error("Email is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      value,
      otp,
      userType: "ADMIN",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = req.body;
    if (!password) {
      throw new Error("Password is required");
    }
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Portfolio Controllers

export const userPortfolio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }

    const userData = await UserModel.findById(id).lean();
    const response = await portfolioServices.userPortfolio({
      userData: { ...userData, id: userData?._id },
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

async function validateStoreKit2JWS(
  signedJWS: string
): Promise<{ valid: boolean; data?: any; error?: string }> {
  try {
    const decodedHeader = jwt.decode(signedJWS, { complete: true })?.header;
    const header = decodedHeader as any;
    if (
      header.alg !== "ES256" ||
      !Array.isArray(header.x5c) ||
      header.x5c.length === 0
    ) {
      return { valid: false, error: "Invalid header: missing ES256 or x5c" };
    }
    // Step 2: Extract Apple's intermediate cert (the first one in x5c)
    const appleCertBase64 = header.x5c[0];
    const applePublicKey = `-----BEGIN CERTIFICATE-----\n${appleCertBase64}\n-----END CERTIFICATE-----`;

    // Step 3: Verify signature using the embedded cert
    const payload = jwt.verify(signedJWS, applePublicKey, {
      algorithms: ["ES256"],
    }) as any;

    console.log(payload);

    return {
      valid: true,
      data: {
        transactionId: payload.transactionId,
        originalTransactionId:
          payload.originalTransactionId || payload.transactionId,
        productId: payload.productId,
        purchaseDate: new Date(Number(payload.purchaseDate)),
        expiresDate: payload.expiresDate
          ? new Date(Number(payload.expiresDate))
          : null,
        environment: payload.environment, // "Sandbox" or "Production"
        isTrial: payload.offerDiscountType === "FREE_TRIAL" ? true : false,
        price: payload.price,
        currency: payload.currency,
        transactionReason: payload.transactionReason,
        appAccountToken: payload.appAccountToken, // very useful to match user
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export const validateIosReceipt = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { receiptData } = req.body;

    // console.log(receiptData);

    if (!receiptData) {
      return res.status(400).json({ message: "receiptMissing" });
    }

    const result = await validateStoreKit2JWS(receiptData);

    const {
      transactionId,
      originalTransactionId,
      productId,
      purchaseDate,
      expiresDate,
      environment,
      currency,
      isTrial,
      price,
      transactionReason,
    } = result.data;

    const issuerId = process.env.APPLE_ISSUER_ID || "";
    const keyId = process.env.APPLE_KEY_ID || "";
    const bundleId = process.env.APPLE_BUNDEL_ID || "";
    const signingKey = process.env.APPLE_PRIVATE_KEY || "";
    const environmentUsed =
      environment === "Sandbox" ? Environment.SANDBOX : Environment.PRODUCTION;

    const client = new AppStoreServerAPIClient(
      signingKey,
      keyId,
      issuerId,
      bundleId,
      environmentUsed
    );

    let response: any = null;
    let transactions: string[] = [];

    const transactionHistoryRequest: TransactionHistoryRequest = {
      sort: Order.ASCENDING,
      revoked: false,
      productTypes: [ProductType.AUTO_RENEWABLE],
    };

    do {
      if (!response) {
        // FIRST request: DO NOT pass revision at all
        response = await client.getTransactionHistory(
          originalTransactionId,
          null,
          transactionHistoryRequest,
          GetTransactionHistoryVersion.V2
        );
      } else {
        // SUBSEQUENT requests: pass the received revision
        response = await client.getTransactionHistory(
          originalTransactionId,
          response.revision,
          transactionHistoryRequest,
          GetTransactionHistoryVersion.V2
        );
      }

      if (response.signedTransactions) {
        transactions.push(...response.signedTransactions);
      }
    } while (response.hasMore);

    console.log(transactions);
    console.log(
      "xxxxxxx---xxxxxxxx",
      response,
      transactions,
      "xxxxxxx---xxxxxxxx"
    );

    const decodedTransactions = [];

    for (const signedTx of transactions) {
      const decoded = await validateStoreKit2JWS(signedTx);
      decodedTransactions.push(decoded);
    }

    console.log("Decoded Transactions:", decodedTransactions);

    const latest: any = decodedTransactions.sort(
      (a: any, b: any) => b.data.purchaseDate - a.data.purchaseDate
    )[0];

    console.log("XXXXX", latest, "xxxxxx")


    if(!latest.valid){
      throw new Error("Invalid Receipt")
    }

    const planData = await planModel.findOne({
      iosProductId: latest.data.productId,
    });

    if (!planData) {
      throw new Error("No Plan Found");
    }

    const userId = user.id;

    const checkExist = await SubscriptionModel.findOne({ userId });

    if (latest.data.price === 0 && !checkExist) {
      await SubscriptionModel.create({
        userId,
        subscriptionId: latest.data.productId,
        planId: planData._id,
        deviceType: "IOS",
        orderId: originalTransactionId,
        amount: 0, // Apple doesn't give price in receipt
        currency: currency.toLowerCase(),
        status: "trialing",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialStart: new Date(latest.data.purchaseDate),
        trialEnd: new Date(latest.data.expiresDate),
        environment: latest.data.environment,
      });
    } else {
      if (latest.data.expiresDate > new Date()) {
        await SubscriptionModel.findOneAndUpdate(
          { userId, environment: latest.data.environment },
          {
            $set: {
              subscriptionId: latest.data.productId,
              planId: planData._id,
              orderId: originalTransactionId,
              deviceType: "IOS",
              currentPeriodStart: new Date(latest.data.purchaseDate),
              currentPeriodEnd: new Date(latest.data.expiresDate),
              status:
                latest.data.expiresDate > new Date()
                  ? "active"
                  : checkExist?.status,
              trialStart: null,
              trialEnd: null,
              currency: currency.toLowerCase(),
              amount: latest.data.price / 1000,
              environment: environment,
            },
          },
          { new: true, upsert: true }
        );
      } else {
        throw new Error("No Plan Found");
      }
    }

    return res.status(200).json({
      message: "receiptValid",
    });

    // // STEP 4: Create or update subscription
    // const existingSub = await SubscriptionModel.findOne({
    //   orderId: originalTransactionId,
    // });

    // let subscription;
    // if (!existingSub && isTrial) {
    //   // create new subscription
    //   subscription = await SubscriptionModel.create({
    //     userId,
    //     subscriptionId: productId,
    //     planId: planData._id,
    //     deviceType: "IOS",
    //     orderId: originalTransactionId,
    //     amount: 0, // Apple doesn't give price in receipt
    //     currency: currency.toLowerCase(),
    //     status: "trialing",
    //     currentPeriodStart: purchaseDate,
    //     currentPeriodEnd: expiresDate,
    //     trialStart: purchaseDate,
    //     trialEnd: expiresDate,
    //     environment: environment,
    //   });

    //   return res.status(200).json({
    //     message: "receiptValid",
    //     subscription,
    //   });
    // } else if (
    //   transactionReason === "PURCHASE" &&
    //   (existingSub?.status === "canceled" ||
    //     existingSub?.status === "active") &&
    //   existingSub?.userId === userId
    // ) {
    //   // update existing subscription
    //   subscription = await SubscriptionModel.findOneAndUpdate(
    //     { userId },
    //     {
    //       $set: {
    //         subscriptionId: productId,
    //         planId: planData._id,
    //         currentPeriodStart: purchaseDate,
    //         currentPeriodEnd: expiresDate,
    //         status: expiresDate > new Date() ? "active" : "past_due",
    //         trialStart: null,
    //         trialEnd: null,
    //         currency: currency.toLowerCase(),
    //         price: price / 1000,
    //         environment: environment,
    //       },
    //     },
    //     { new: true }
    //   );

    //   return res.status(200).json({
    //     message: "receiptValid",
    //     subscription,
    //   });
    // } else if (existingSub && existingSub?.userId !== userId) {
    //   throw Error("Subscription belongs to another account");
    // } else {
    //   throw Error("No Active Subscription Found");
    // }
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
