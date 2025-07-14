import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { configDotenv } from "dotenv";
import { decode } from "next-auth/jwt";
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from "src/utils/response";
import { UserModel } from "src/models/user/user-schema";
import { TokenModel } from "src/models/user/token-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import path from "path";
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

    const checkToken = await TokenModel.findOne({
      token,
    });

    if (!checkToken) {
      return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");
    }
    req.user = decoded;

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
) => {
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
    const subscription = await SubscriptionModel.findOne({
      userId: id,
      status: { $in: ["active", "trialing", "canceling"] }, // Only valid ones
    })
      .sort({ createdAt: -1 }) // Latest first
      .populate({
        path: "planId",
        select: `name`,
      })
      .lean();

    if (!subscription) {
      return UNAUTHORIZED(res, "noSubscription", req?.body?.language || "en");
    }
    (subscription as any).planName = (subscription as any).planId.name[
      (req.user as any).language
    ];
    (subscription as any).planId = (subscription as any).planId._id;
    if (req.user && typeof req.user !== "string") {
      (req.user as JwtPayload & { subscription?: any }).subscription =
        subscription;
    }
    next();
  } catch (error) {
    return INTERNAL_SERVER_ERROR(res, req?.body?.language || "en");
  }
};
