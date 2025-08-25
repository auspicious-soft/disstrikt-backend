import admin from "firebase-admin";
import { configDotenv } from "dotenv";
import mongoose, { Types } from "mongoose";
import { notificationMessages } from "../messages";
import { NotificationModel } from "src/models/notifications/notification-schema";
import { UserModel } from "src/models/user/user-schema";

configDotenv();

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = () => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("Missing Firebase service account credentials");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Fix multiline private key issue
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    );

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized");
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    throw error;
  }
};

/**
 * Notification Service
 * @param userIds array of user ObjectIds
 * @param type notification type (key from notificationMessages)
 * @param language language code (default: 'en')
 * @param referenceId optional reference ids (bookingId, jobId, etc.)
 */
export const NotificationService = async (
  userIds: Types.ObjectId[],
  type: keyof (typeof notificationMessages)["en"],
  referenceId?: Record<string, any>
) => {
  try {
    // pick message template

    const notifications: any[] = [];

    for (const userId of userIds) {
      const userData = await UserModel.findById(userId).select("fcmToken");

      const messageTemplate =
        notificationMessages[userData?.language || "en"]?.[type];

      // Save each user’s notification separately in DB
      if (userData?.fcmToken && messageTemplate) {
        const notificationDoc = await NotificationModel.create({
          userId,
          type,
          title: messageTemplate.title,
          description: messageTemplate.description,
          referenceId,
          isRead: false,
        });

        notifications.push(notificationDoc);

        // Send push notification
        if (messageTemplate.title) {
          try {
            await admin.messaging().send({
              notification: {
                title: messageTemplate.title,
                body: messageTemplate.description,
              },
              data: {
                type,
                referenceId: referenceId ? JSON.stringify(referenceId) : "",
              },
              token: userData?.fcmToken,
            });
            console.log(`📲 Push sent to user ${userId}`);
          } catch (pushErr) {
            console.error(
              `❌ Error sending push notification to user ${userId}:`,
              pushErr
            );
          }
        }
      }
    }

    return notifications;
  } catch (err: any) {
    console.error("❌ NotificationService error:", err);
    throw err;
  }
};
