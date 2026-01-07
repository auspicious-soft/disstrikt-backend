import { Request, Response } from "express";
import { Types } from "mongoose";
import { planModel } from "src/models/admin/plan-schema";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { StudioBookingModel } from "src/models/admin/studio-booking-schema";
import { StudioModel } from "src/models/admin/studio-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const getLevelUp = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const activePlan = (await SubscriptionModel.findOne({
      userId: userData.id,
    })
      .populate("planId")
      .lean()) as any;

    let data;

    if (
      ["trialing", "incomplete", "canceled", "past_due"].includes(
        userData?.subscription?.status
      )
    ) {
      data = [
        {
          type: "Portfolio Bootcamp",
          eligible: false,
          percentage: 0,
          daysLeft: null,
          reason: "NEED_PLAN_UPGRADE",
        },
        {
          type: "Skill Bootcamp",
          eligible: false,
          percentage: 0,
          daysLeft: null,
          reason: "NEED_PLAN_UPGRADE",
        },
        {
          type: "Create a Shoot",
          eligible: false,
          percentage: 0,
          daysLeft: null,
          reason: "NEED_PLAN_UPGRADE",
        },
      ];
    } else {
      const now = new Date();

      const futureBookings = await StudioBookingModel.find({
        userId: userData.id,
        time: { $gt: now },
        status: "Booked",
      }).sort({ time: 1 });

      const hasFutureBooking = futureBookings.length > 0;

      // Last completed booking (attended = Yes OR time < now)
      const lastCompletedBooking = await StudioBookingModel.findOne({
        userId: userData.id,
        status: "Booked",
        time: { $lt: now },
      })
        .sort({ time: -1 })
        .lean();

      const daysSinceLastBooking = lastCompletedBooking
        ? Math.floor(
            (now.getTime() - new Date(lastCompletedBooking.time).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      const calculateEligibility = (
        hasAccess: boolean,
        coolingDays: number
      ) => {
        if (!hasAccess) {
          return {
            eligible: false,
            percentage: 0,
            daysLeft: 0,
            reason: "NO_ACCESS",
          };
        }

        if (hasFutureBooking) {
          return {
            eligible: false,
            percentage: 100,
            daysLeft: null,
            reason: "HAS_FUTURE_BOOKING",
          };
        }

        if (!lastCompletedBooking || coolingDays === 0) {
          return {
            eligible: true,
            percentage: 100,
            daysLeft: 0,
          };
        }

        const remainingDays = coolingDays - daysSinceLastBooking!;

        if (remainingDays > 0) {
          return {
            eligible: false,
            percentage: Math.floor(
              ((coolingDays - remainingDays) / coolingDays) * 100
            ),
            daysLeft: remainingDays,
            reason: "IN_COOLING_PERIOD",
          };
        }

        return {
          eligible: true,
          percentage: 100,
          daysLeft: 0,
        };
      };

      const {
        portfolioBootcamp,
        portfolioCooling,
        skillBootcamp,
        skillCooling,
        createAShoot,
        shootCooling,
      } = activePlan.planId.fullAccess;

      const portfolio = calculateEligibility(
        portfolioBootcamp,
        portfolioCooling
      );

      const skill = calculateEligibility(skillBootcamp, skillCooling);

      const shoot = calculateEligibility(createAShoot, shootCooling);

      data = [
        {
          type: "Portfolio Bootcamp",
          ...portfolio,
        },
        {
          type: "Skill Bootcamp",
          ...skill,
        },
        {
          type: "Create a Shoot",
          ...shoot,
        },
      ];
    }

    return OK(res, data || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getStudios = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const studios = await StudioModel.find({ isDeleted: false }).select(
      "name city country"
    );
    const activityType = [
      "Portfolio Bootcamp",
      "Skill Bootcamp",
      "Create a Shoot",
    ];
    const additionalInfo = await PlatformInfoModel.findOne({})
      .select(
        "shootPolicy shootGoals shootFormat vibes addOnFeatures canBringOutfits"
      )
      .lean();

    let isEligible;

    const data = {
      studios,
      activityType: activityType,
      ...additionalInfo,
    };
    return OK(res, data || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getAvailableDateAndSlots = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { id } = req.query as any;

    if (!id) {
      throw new Error("Studio id is required");
    }

    const studioExists = await StudioModel.exists({ _id: id });
    if (!studioExists) {
      throw new Error("Studio does not exist");
    }

    const now = new Date();

    const data = await StudioBookingModel.aggregate([
      {
        $match: {
          studioId: new Types.ObjectId(id),
          time: { $gt: now },
          status: { $ne: "Booked" }, // Empty / Cancelled
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },
          slots: {
            $push: {
              id: "$_id",
              startTime: "$startTime",
              endTime: "$endtime",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          slots: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    return OK(res, data, req.body.language);
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language)
      : INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const bookStudio = async (req: Request, res: Response) => {
  try {
    const {
      slotId,
      activityType = "",
      addOnFeatures = [],
      shootFormat = "",
      shootGoals = "",
      vibes = "",
      canBringOutfits = 0,
    } = req.body;

    const checkExist = await StudioBookingModel.findById(slotId);
    if (!checkExist || checkExist.status === "Booked") {
      throw new Error("Slot does not available");
    }

    if (
      !["Portfolio Bootcamp", "Skill Bootcamp", "Create a Shoot"].includes(
        activityType
      )
    ) {
      throw new Error("Invalid activity type");
    }

    const userData = req.user as any;

    const bookingData = await StudioBookingModel.findByIdAndUpdate(
      slotId,
      {
        $set: {
          userId: userData.id,
          activityType,
          addOnFeatures,
          shootFormat,
          shootGoals,
          vibes,
          canBringOutfits,
          status: "Booked",
        },
      },
      { new: true }
    );

    return OK(res, bookingData, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getBookings = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const checkExist = await StudioBookingModel.find({
      userId: userData.id,
    }).sort({ time: -1 });
    return OK(res, checkExist, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
