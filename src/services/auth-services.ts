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

    const token = await generateToken(userData);
    const user = userData.toObject();
    delete user.password;

    return { ...user, token };
  },

  async resendOtp(payload: any) {
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
      isVerifiedEmail: true,
      authType: "EMAIL",
    });

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

    checkExist.fcmToken = payload.fcmToken;
    checkExist.save();

    const token = await generateToken(checkExist);
    const userObj = checkExist.toObject();
    delete userObj.password;
    return { ...userObj, token };
  },

  async forgetPassword(payload: any) {
    const checkExist = await UserModel.findOne({
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
      payload.language,
      "USER"
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

    await UserModel.updateOne({ email: data.email }, { $set: { password } });

    return {};
  },
  async userMoreInfo(payload: any) {
    const {measurements, gender, dob, userData} = payload;
    const checkUser = await UserModel.findById(userData.id);
    if(!checkUser || !checkUser?.isVerifiedEmail){
      throw new Error("userNotFound")
    }

    console.log(checkUser)
    return {}
  },

};
