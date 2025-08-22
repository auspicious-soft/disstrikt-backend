import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { TaskResponseModel } from "src/models/admin/task-response";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserModel } from "src/models/user/user-schema";
import { userServices } from "src/services/admin/admin-services";
import { countries } from "src/utils/constant";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";
import { JobModel } from "src/models/admin/jobs-schema";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    let { country = "UK" } = req.query;

    if (country && !countries.includes(country as string)) {
      throw new Error("Invalid Country");
    }

    const users = await UserModel.find().lean();
    const pendingReviews = await TaskResponseModel.find({
      taskReviewed: false,
    }).lean();
    const activePlans = await planModel.find().lean();

    // Count subscribed users by plan
    const subscribedUsers = await Promise.all(
      activePlans.map(async (val: any) => {
        const count = await SubscriptionModel.countDocuments({
          planId: val._id,
          status: "active",
        });
        return {
          name: val.name.en,
          count,
        };
      })
    );

    // --- User overview grouped by country ---
    const userOverview = await UserModel.aggregate([
      {
        $group: {
          _id: "$country",
          totalUsers: { $sum: 1 },
          userIds: { $push: "$_id" },
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          let: { userIds: "$userIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$userId", "$$userIds"] },
                    { $eq: ["$status", "active"] },
                  ],
                },
              },
            },
          ],
          as: "activeSubscriptions",
        },
      },
      {
        $project: {
          country: "$_id",
          totalUsers: 1,
          subscribedUsersCount: { $size: "$activeSubscriptions" },
        },
      },
    ]);

    const now = new Date();

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Revenue this month
    const revenueMonthAgg = await TransactionModel.aggregate([
      {
        $match: {
          status: "succeeded",
          paidAt: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: "$currency",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const revenueThisMonth: Record<string, number> = { eur: 0, gbp: 0 };
    revenueMonthAgg.forEach((r: any) => {
      revenueThisMonth[r._id.toLowerCase()] = r.total;
    });

    // Revenue this year
    const revenueYearAgg = await TransactionModel.aggregate([
      {
        $match: {
          status: "succeeded",
          paidAt: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: "$currency",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const revenueThisYear: Record<string, number> = { eur: 0, gbp: 0 };
    revenueYearAgg.forEach((r: any) => {
      revenueThisYear[r._id.toLowerCase()] = r.total;
    });

    // Users created this month
    const thisMonthUsers = await UserModel.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

   const totalJobs = await JobModel.countDocuments();

// active jobs (date >= now)
const activeJobs = await JobModel.countDocuments({
  date: { $gte: now },
});
    const response = {
      activeUsers: users.length || 0,
      pendingReviews: pendingReviews.length || 0,
      subscribedUsers,
      userOverview, // 👈 now included
      revenueThisMonth,
      revenueThisYear,
      thisMonthUsers,
      totalJobs,
    };

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
