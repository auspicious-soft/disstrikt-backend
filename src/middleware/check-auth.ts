import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { configDotenv } from "dotenv";
import { decode } from "next-auth/jwt";
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from "src/utils/response";
import { UserModel } from "src/models/user/user-schema";
import { TokenModel } from "src/models/user/token-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import path from "path";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { AdminModel } from "src/models/admin/admin-schema";
import stripe from "src/config/stripe";

configDotenv();
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}

export const checkUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");
    }

    const decoded = jwt.verify(token, process.env.AUTH_SECRET as string) as any;
    if (!decoded)
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");

    const checkToken = (await TokenModel.findOne({
      token,
    })
      .populate("userId")
      .lean()) as any;

    if (!checkToken) {
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");
    }

    const moreInfo = (await UserInfoModel.findOne({
      userId: checkToken?.userId._id,
    })) as any;

    const subscription = await SubscriptionModel.findOne({
      userId: checkToken?.userId._id,
    });

    req.user = {
      id: checkToken?.userId._id,
      authType: checkToken?.userId?.authType,
      country: checkToken.userId?.country,
      countryCode: checkToken.userId?.countryCode,
      email: checkToken.userId?.email,
      planId: subscription?.planId,
      fullName: checkToken.userId?.fullName,
      image: checkToken.userId?.image,
      language: checkToken.userId?.language,
      phone: checkToken.userId?.phone,
      gender: moreInfo?.gender,
      currentMilestone: checkToken?.userId?.currentMilestone,
      userType: decoded?.userType,
    };

    //********************************
    //For Admin built in Next Js
    // else {
    //     const decoded = await decode({
    //         secret: process.env.AUTH_SECRET as string,
    //         token,
    //         salt: process.env.JWT_SALT as string
    //     })
    //     if (!decoded) return res.status(httpStatusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized token invalid or expired" });
    //         (req as any).currentUser = decoded.id
    //     }
    //********************************

    next();
  } catch (error) {
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    req.body.language =
      typeof req.user === "object" &&
      req.user !== null &&
      "language" in req.user
        ? (req.user as any).language
        : "en";

    let id: string | null = null;
    if (req.user && typeof req.user !== "string" && "id" in req.user) {
      id = (req.user as JwtPayload).id as string;
    }

    // 🔑 CRITICAL FIX: Include "past_due" for BACS/SEPA users
    const subscription = await SubscriptionModel.findOne({
      userId: id,
      status: {
        $in: [
          "active",
          "trialing",
          "canceling",
          "past_due", // 🔧 Added for BACS/SEPA processing delays
        ],
      },
    })
      .sort({ createdAt: -1 }) // Latest first
      .populate({
        path: "planId",
        select: "name",
      })
      .lean();

    if (!subscription) {
      return UNAUTHORIZED(res, "noSubscription", req?.body?.language || "en");
    }

    const userType = (req?.user as any)?.userType || "web";
    // 🔑 ADDITIONAL CHECK: Verify if "past_due" is legitimate access
    if (subscription.status === "past_due" && userType !== "web") {
      try {
        return UNAUTHORIZED(res, "paymentFailed", req?.body?.language || "en");
      } catch (error) {
        console.error("Error checking payment method:", error);
        // If we can't verify payment method, be conservative and deny access
        return UNAUTHORIZED(
          res,
          "subscriptionError",
          req?.body?.language || "en"
        );
      }
    }

    if (subscription.status === "past_due" && userType == "web") {
      try {
        // Get payment method details to determine if it's BACS/SEPA
        const paymentMethod = subscription.paymentMethodId
          ? await stripe.paymentMethods.retrieve(subscription.paymentMethodId)
          : null;

        const isBacsOrSepa =
          paymentMethod?.type === "bacs_debit" ||
          paymentMethod?.type === "sepa_debit";

        if (isBacsOrSepa) {
          // 🔧 For BACS/SEPA, check if it's within reasonable processing time
          const daysSincePastDue = subscription.updatedAt
            ? Math.floor(
                (Date.now() - new Date(subscription.updatedAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          // Allow 7 days for BACS, 3 days for SEPA processing
          const maxDays = paymentMethod?.type === "bacs_debit" ? 7 : 3;

          if (daysSincePastDue > maxDays) {
            console.log(
              `🚫 BACS/SEPA payment overdue by ${daysSincePastDue} days`
            );
            return UNAUTHORIZED(
              res,
              "subscriptionOverdue",
              req?.body?.language || "en"
            );
          }

          console.log(
            `✅ Allowing BACS/SEPA user access (${daysSincePastDue}/${maxDays} days)`
          );
        } else {
          // 🚫 For card payments, past_due should not have access
          console.log("🚫 Card payment past_due - denying access");
          return UNAUTHORIZED(
            res,
            "paymentFailed",
            req?.body?.language || "en"
          );
        }
      } catch (stripeError) {
        console.error("Error checking payment method:", stripeError);
        // If we can't verify payment method, be conservative and deny access
        return UNAUTHORIZED(
          res,
          "subscriptionError",
          req?.body?.language || "en"
        );
      }
    }

    // 🔑 ADDITIONAL CHECK: Handle trial periods properly
    if (subscription.status === "trialing" && userType == "web") {
      // Check if trial has actually expired
      if (
        subscription.trialEnd &&
        new Date(subscription.trialEnd) < new Date()
      ) {
        // Trial has expired, check if there's a pending payment
        try {
          return UNAUTHORIZED(
            res,
            "paymentFailed",
            req?.body?.language || "en"
          );
          // Recheck with updated status
        } catch (stripeError) {
          console.error("Error syncing subscription status:", stripeError);
        }
      }
    }

    // 🔑 ENHANCED STATUS INFORMATION: Add more context to subscription object
    const enhancedSubscription =
      userType === "web"
        ? {
            ...subscription,
          }
        : {
            ...subscription,
            isGracePeriod: subscription.status === "past_due",
            paymentProcessing:
              (subscription.status === "past_due" &&
                (subscription as any).paymentMethodType === "bacs_debit") ||
              (subscription as any).paymentMethodType === "sepa_debit",
          };

    // // Set plan name
    (enhancedSubscription as any).planName = (
      enhancedSubscription as any
    ).planId.name[(req.user as any).language];
    (enhancedSubscription as any).planId = (
      enhancedSubscription as any
    ).planId._id;

    if (req.user && typeof req.user !== "string") {
      (req.user as JwtPayload & { subscription?: any }).subscription =
        enhancedSubscription;
    }

    next();
  } catch (error) {
    console.error("checkSubscription error:", error);
    return INTERNAL_SERVER_ERROR(res, req?.body?.language || "en");
  }
};

export const checkAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");
    }

    // For Admin built in Next Js

    const decoded = await decode({
      secret: process.env.AUTH_SECRET as string,
      token,
      salt: process.env.JWT_SALT as string,
    });

    const adminData = await AdminModel.findById((decoded as any).id).lean();

    if (!decoded)
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");

    if (adminData?.isBlocked) {
      return UNAUTHORIZED(res, "adminBlocked", req.body.language || "en");
    }

    req.user = {
      ...adminData,
    };

    next();
  } catch (error) {
    return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");
  }
};
