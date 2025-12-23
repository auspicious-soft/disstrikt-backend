import admin from "firebase-admin";
import { configDotenv } from "dotenv";
import mongoose, { Types } from "mongoose";
import { notificationMessages } from "../messages";
import { NotificationModel } from "src/models/notifications/notification-schema";
import { UserModel } from "src/models/user/user-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";

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
  referenceId?: Record<string, any>,
  number?: any
) => {
  try {
    // pick message template

    const notifications: any[] = [];

    for (const userId of userIds) {
      const userData = await UserModel.findById(userId).select("fcmToken language");

      const messageTemplate =
        notificationMessages[userData?.language || "en"]?.[type];

      const userInfo = (await UserInfoModel.findOne({ userId })
        .select("notificationSettings")
        .lean()) as any;
      const { notificationSettings } = userInfo;

      let goAhead = true;

      if (!notificationSettings.jobAlerts && type === "JOB_ALERT") {
        goAhead = false;
      }

      if (
        !notificationSettings.tasksPortfolioProgress &&
        ["TASK_COMPLETED", "TASK_REJECTED", "MILESTONE_UNLOCKED"].includes(type)
      ) {
        goAhead = false;
      }
      if (userData?.fcmToken && messageTemplate && goAhead) {
        // Save each user’s notification separately in DB
        const notificationDoc = await NotificationModel.create({
          userId,
          type,
          title: number
            ? `${messageTemplate.title} - (${number})`
            : messageTemplate.title,
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
                title: number
                  ? `${messageTemplate.title} - (${number})`
                  : messageTemplate.title,
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

// export const NotificationService = async (
//   userIds: Types.ObjectId[],
//   type: keyof (typeof notificationMessages)["en"],
//   referenceId?: Record<string, any>,
//   number?: any
// ) => {
//   try {
//     if (!userIds.length) return [];

//     /**
//      * 1️⃣ Fetch all required user data in ONE DB call
//      */
//     const users = await UserModel.aggregate([
//       {
//         $match: {
//           _id: { $in: userIds },
//         },
//       },
//       {
//         $lookup: {
//           from: "userinfos",
//           localField: "_id",
//           foreignField: "userId",
//           as: "userInfo",
//         },
//       },
//       { $unwind: "$userInfo" },
//       {
//         $project: {
//           _id: 1,
//           fcmToken: 1,
//           language: 1,
//           notificationSettings: "$userInfo.notificationSettings",
//         },
//       },
//     ]);

//     if (!users.length) return [];

//     /**
//      * 2️⃣ Filter eligible users + prepare notification docs
//      */
//     const notificationsToInsert: any[] = [];
//     const pushPayloads: any[] = [];

//     for (const user of users) {
//       const messageTemplate =
//         (notificationMessages as any)[user?.language || "en"]?.[type];

//       if (!messageTemplate || !user.fcmToken) continue;

//       const settings = user.notificationSettings || {};

//       // business rules
//       if (type === "JOB_ALERT" && !settings.jobAlerts) continue;

//       if (
//         ["TASK_COMPLETED", "TASK_REJECTED", "MILESTONE_UNLOCKED"].includes(
//           type
//         ) &&
//         !settings.tasksPortfolioProgress
//       ) {
//         continue;
//       }

//       const title = number
//         ? `${messageTemplate.title} - (${number})`
//         : messageTemplate.title;

//       notificationsToInsert.push({
//         userId: user._id,
//         type,
//         title,
//         description: messageTemplate.description,
//         referenceId,
//         isRead: false,
//       });

//       pushPayloads.push({
//         token: user.fcmToken,
//         notification: {
//           title,
//           body: messageTemplate.description,
//         },
//         data: {
//           type,
//           referenceId: referenceId ? JSON.stringify(referenceId) : "",
//         },
//       });
//     }

//     /**
//      * 3️⃣ Bulk insert notifications (1 DB write)
//      */
//     if (notificationsToInsert.length) {
//       await NotificationModel.insertMany(notificationsToInsert, {
//         ordered: false,
//       });
//     }

//     /**
//      * 4️⃣ Send push notifications in parallel (non-blocking)
//      */
//     if (pushPayloads.length) {
//       admin
//         .messaging()
//         .sendEach(pushPayloads)
//         .catch((err) => console.error("❌ Push notification error:", err));
//     }

//     return notificationsToInsert;
//   } catch (err) {
//     console.error("❌ NotificationService error:", err);
//     throw err;
//   }
// };
