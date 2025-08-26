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
import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    let { country = "UK" } = req.query;

    if (country && !countries.includes(country as string)) {
      throw new Error("Invalid Country");
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Run independent queries in parallel
    const [
      users,
      pendingReviews,
      activePlans,
      revenueMonthAgg,
      revenueYearAgg,
      thisMonthUsers,
      totalJobs,
      activeJobs,
      monthlyCounts,
      topThreeTasks,
      userOverview,
    ] = await Promise.all([
      UserModel.find().lean(),
      TaskResponseModel.find({ taskReviewed: false }).lean(),
      planModel.find().lean(),

      // Revenue this month
      TransactionModel.aggregate([
        {
          $match: {
            status: "succeeded",
            paidAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: "$currency", total: { $sum: "$amount" } } },
      ]),

      // Revenue this year
      TransactionModel.aggregate([
        {
          $match: {
            status: "succeeded",
            paidAt: { $gte: yearStart, $lte: yearEnd },
          },
        },
        { $group: { _id: "$currency", total: { $sum: "$amount" } } },
      ]),

      // Users created this month
      UserModel.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      }),

      JobModel.countDocuments(),
      JobModel.countDocuments({ date: { $gte: now } }),

      // Monthly applied job counts
      AppliedJobModel.aggregate([
        { $match: { createdAt: { $gte: yearStart, $lt: yearEnd } } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, month: "$_id.month", count: 1 } },
        { $sort: { month: 1 } },
      ]),

      // Top three tasks by frequency
      TaskResponseModel.aggregate([
        { $group: { _id: "$taskNumber", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
        { $project: { taskNumber: "$_id", count: 1, _id: 0 } },
      ]),

      // Optimized user overview (avoid pushing all IDs)
      UserModel.aggregate([
        {
          $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $match: { status: "active" } }],
            as: "subscriptions",
          },
        },
        {
          $group: {
            _id: "$country",
            totalUsers: { $sum: 1 },
            subscribedUsersCount: {
              $sum: { $size: "$subscriptions" },
            },
          },
        },
        {
          $project: {
            country: "$_id",
            totalUsers: 1,
            subscribedUsersCount: 1,
          },
        },
      ]),
    ]);

    // Process subscribed users count by plan
    const subscribedUsers = await Promise.all(
      activePlans.map(async (val: any) => {
        const count = await SubscriptionModel.countDocuments({
          planId: val._id,
          status: "active",
        });
        return { name: val.name.en, count };
      })
    );

    // Convert revenue results into simple objects
    const revenueThisMonth = revenueMonthAgg.reduce<Record<string, number>>(
      (acc, r) => ({ ...acc, [r._id.toLowerCase()]: r.total }),
      { eur: 0, gbp: 0 }
    );

    const revenueThisYear = revenueYearAgg.reduce<Record<string, number>>(
      (acc, r) => ({ ...acc, [r._id.toLowerCase()]: r.total }),
      { eur: 0, gbp: 0 }
    );

    // Fill missing months in O(1)
    const monthMap = new Map(monthlyCounts.map((m) => [m.month, m.count]));
    const jobApplication = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: monthMap.get(i + 1) || 0,
    }));

    topThreeTasks.map((data:any)=>{
      data.taskNumber +=1
    })

    const response = {
      activeUsers: users.length || 0,
      pendingReviews: pendingReviews.length || 0,
      subscribedUsers,
      userOverview,
      revenueThisMonth,
      revenueThisYear,
      thisMonthUsers,
      totalJobs,
      activeJobs,
      jobApplication,
      topThreeTasks,
    };

    return OK(res, response, req.body.language || "en");
  } catch (err: any) {
    return BADREQUEST(
      res,
      err.message || "Something went wrong",
      req.body.language || "en"
    );
  }
};
