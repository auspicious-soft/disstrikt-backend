import { Translate } from "@google-cloud/translate/build/src/v2";
import bcrypt from "bcryptjs";
import { OtpModel } from "src/models/system/otp-schema";
import { otpPurpose } from "./constant";
import { Resend } from "resend";
import { configDotenv } from "dotenv";
import SignupVerification from "./email-templates/signup-verification";
import ForgotPasswordVerification from "./email-templates/forget-password-verification";
import { customMessages, SupportedLang } from "./messages";
import { IUser } from "src/models/user/user-schema";
import jwt from "jsonwebtoken";
import { TokenModel } from "src/models/user/token-schema";
import axios from "axios";
import jwkToPem from "jwk-to-pem";
import fs from "fs";
import { DateTime } from "luxon";
import { AdminLogsModel } from "src/models/admin/admin-logs-schema";

configDotenv();
const resend = new Resend(process.env.RESEND_API_KEY);

export function getTranslatedGender(gender: string, lang: string) {
  const translations = {
    en: { male: "Male", female: "Female", other: "Other" },
    nl: { male: "Man", female: "Vrouw", other: "Anders" },
    fr: { male: "Homme", female: "Femme", other: "Autre" },
    es: { male: "Hombre", female: "Mujer", other: "Otro" },
  };
  type GenderKeys = "male" | "female" | "other";
  return (
    translations[lang as "en" | "nl" | "fr" | "es"]?.[gender as GenderKeys] ||
    gender
  );
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashPassword: string) {
  return await bcrypt.compare(password, hashPassword);
}

export async function generateToken(user: IUser) {
  const tokenPayload = {
    id: user._id,
    email: user.email || null,
    phone: user.phone || null,
    fullName: user.fullName,
    image: user.image,
    country: user.country,
    language: user.language,
    countryCode: user.countryCode,
    authType: user.authType,
    currentMilestone: user.currentMilestone,
    userType: user.userType,
  };

  const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET as string, {
    expiresIn: "60d",
  });

  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  await TokenModel.deleteMany({ userId: user._id });
  await TokenModel.create({
    token,
    userId: user._id,
    expiresAt,
  });

  return token;
}

export async function generateAndSendOtp(
  value: string,
  purpose: string,
  type: string,
  language: SupportedLang,
  userType: string
) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!otpPurpose.includes(purpose) || !["EMAIL", "PHONE"].includes(type)) {
    throw new Error("Invalid Otp Purpose Or Otp Type");
  }

  const checkExist = await OtpModel.findOne({
    email: type === "EMAIL" ? value : null,
    phone: type === "EMAIL" ? null : value,
    type,
    purpose,
    userType,
  });

  if (checkExist) {
    await OtpModel.findByIdAndDelete(checkExist._id);
  }

  await OtpModel.create({
    email: type === "EMAIL" ? value : null,
    phone: type === "EMAIL" ? null : value,
    type,
    purpose,
    code: otp,
    userType,
  });

  if (type === "EMAIL") {
    await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: value,
      subject:
        purpose === "SIGNUP"
          ? customMessages[language]?.["subjectEmailVerification"]
          : customMessages[language]?.["subjectResetPassword"],
      react:
        purpose === "SIGNUP"
          ? SignupVerification({ otp: otp, language: language })
          : ForgotPasswordVerification({ otp: otp, language: language }),
    });
  }

  return otp;
}

const privateKey = process.env.GOOGLE_PRIVATE_KEY2
  ? process.env.GOOGLE_PRIVATE_KEY2.replace(/\\n/g, "\n")
  : "";

const translate = new Translate({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export async function translateJobFields(jobEnData: any) {
  const languages = ["fr", "es", "nl"];
  const translated = {} as any;

  for (const lang of languages) {
    translated[lang] = {};
    for (const [key, value] of Object.entries(jobEnData)) {
      const [translation] = await translate.translate(value as string, lang);
      translated[lang][key] = translation;
    }
  }

  return translated;
}

export async function verifyAppleToken(idToken: string) {
  const appleKeys = await axios.get("https://appleid.apple.com/auth/keys");
  const decodedHeader: any = jwt.decode(idToken, { complete: true })?.header;
  const key = appleKeys.data.keys.find((k: any) => k.kid === decodedHeader.kid);

  if (!key) throw new Error("Apple public key not found");

  const pubKey = jwkToPem(key);
  const payload: any = jwt.verify(idToken, pubKey, {
    algorithms: ["RS256"],
  });

  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Invalid Apple token issuer");
  }

  return payload;
}

export function convertToUTC(date: string, hour: number, tz: string) {
  return DateTime.fromISO(`${date}T${hour.toString().padStart(2, "0")}:00`, {
    zone: tz,
  })
    .toUTC()
    .toJSDate();
}

export async function saveLogs(payload: any) {
  const { _id, referenceId, referenceModel, logs, email, fullName, role } =
    payload;

  await AdminLogsModel.create({
    adminId: _id,
    referenceId: referenceId,
    referenceModel: referenceModel,
    logs,
    email,
    fullName,
    role,
  });
}
