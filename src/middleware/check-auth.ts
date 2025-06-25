import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { configDotenv } from "dotenv";
import { decode } from "next-auth/jwt";
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from "src/utils/response";
import { UserModel } from "src/models/user/user-schema";
import { TokenModel } from "src/models/user/token-schema";
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
    if (!decoded) return UNAUTHORIZED(res, "invalidToken", req.body.language || "en");

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
