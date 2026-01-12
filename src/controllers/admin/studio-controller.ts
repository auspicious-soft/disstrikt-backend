import { Request, Response } from "express";
import mongoose from "mongoose";
import { CancelBooking2Model } from "src/models/admin/cancel-schema";

import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { StudioBookingModel } from "src/models/admin/studio-booking-schema";
import { StudioModel } from "src/models/admin/studio-schema";
import { convertToUTC } from "src/utils/helper";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const addStudios = async (req: Request, res: Response) => {
  try {
    const {
      id = null,
      name,
      location,
      city,
      country,
      slots = [],
      timeZone,
    } = req.body;

    let studio;

    if (!timeZone) {
      throw new Error("Timezone is mandatory");
    }

    /* -------------------- CREATE / UPDATE STUDIO -------------------- */
    if (id) {
      studio = await StudioModel.findByIdAndUpdate(
        id,
        {
          $set: { name, location, city, country },
        },
        { new: true }
      );

      if (!studio) {
        return BADREQUEST(res, "Studio not found", req.body.language || "en");
      }
    } else {
      studio = await StudioModel.create({
        name,
        location,
        city,
        country,
      });
    }

    /* -------------------- SLOT HANDLING -------------------- */
    if (!slots.length || !studio?._id) {
      return OK(res, studio, req.body.language || "en");
    }

    const studioId = studio._id;

    /* 🔹 Fetch existing dates for this studio */
    const existingDates = await StudioBookingModel.distinct("date", {
      studioId,
    });

    const existingDateSet = new Set(
      existingDates.map((d: Date) => d.toISOString().split("T")[0])
    );

    /* 🔹 Only take slots whose date does NOT exist */
    const newSlots = slots.filter((s: any) => !existingDateSet.has(s.date));

    if (!newSlots.length) {
      return OK(res, studio, req.body.language || "en");
    }

    /* -------------------- GENERATE BOOKINGS -------------------- */
    const bookings: any[] = [];

    for (const s of newSlots) {
      const slotDuration = Number(s.slot);
      if (slotDuration <= 0) continue;

      let currentHour = Number(s.startTime.split(":")[0]);
      const endHour = Number(s.endTime.split(":")[0]);

      while (currentHour + slotDuration <= endHour) {
        const startTimeStr = `${currentHour}:00`;
        const endTimeStr = `${currentHour + slotDuration}:00`;

        const startUTC = convertToUTC(s.date, currentHour, timeZone);

        bookings.push({
          studioId,
          userId: null,
          date: new Date(s.date),
          startTime: startTimeStr,
          endtime: endTimeStr,
          time: startUTC,
          slot: `${slotDuration}h`,
          status: "Empty",
          attended: null,
          activityType: null,
          rating: 0,
          comments: null,
          images: [],
        });

        currentHour += slotDuration;
      }
    }

    /* -------------------- INSERT NEW BOOKINGS -------------------- */
    if (bookings.length) {
      await StudioBookingModel.insertMany(bookings);
    }

    return OK(res, studio, req.body.language || "en");
  } catch (err: any) {
    console.error(err);
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getStudios = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const studios = await StudioModel.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "studiobookings",
          let: { studioId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$studioId", "$$studioId"] },
                    { $eq: ["$status", "Booked"] },
                    { $gte: ["$date", today] },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "futureBookings",
        },
      },
      {
        $addFields: {
          futureBookingCount: {
            $ifNull: [{ $arrayElemAt: ["$futureBookings.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          futureBookings: 0, // remove temp array
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return OK(res, { studios }, req.body.language || "en");
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language || "en")
      : INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getStudioById = async (req: Request, res: Response) => {
  try {
    const { id } = req.query as any;
    if (!id) throw new Error("Studio id is required");

    const studio = await StudioModel.findById(id).lean();
    if (!studio) throw new Error("Studio not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = await StudioBookingModel.aggregate([
      {
        $match: {
          studioId: new mongoose.Types.ObjectId(id),
          date: { $gte: today },
        },
      },
      {
        $group: {
          _id: "$date",

          // count booked slots
          bookedSlots: {
            $sum: {
              $cond: [{ $eq: ["$status", "Booked"] }, 1, 0],
            },
          },

          // date-wide range
          startTime: { $min: "$startTime" },
          endTime: { $max: "$endtime" },
          interval:{ $first: "$slot" },

          // 👇 push all slots
          slots: {
            $push: {
              bookingId: "$_id",
              startTime: "$startTime",
              endTime: "$endtime",
              status: "$status",
              userId: "$userId",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$_id" },
          },
          startTime: 1,
          endTime: 1,
          bookedSlots: { $ifNull: ["$bookedSlots", 0] },
          interval: 1,
          slots: 1, // 👈 expose slots array
        },
      },
      { $sort: { date: 1 } },
    ]);

    return OK(
      res,
      {
        ...studio,
        slots,
      },
      req.body.language || "en"
    );
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language || "en")
      : INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const deleteStudios = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      throw new Error("Id is required");
    }
    const checkExist = await StudioModel.findById(id);
    if (!checkExist) {
      throw new Error("Studio does not exist");
    }
    const now = new Date();
    const checkActiveBookings = await StudioBookingModel.countDocuments({
      studioId: id,
      time: { $gt: now },
      status: "Booked",
    });

    if (checkActiveBookings > 0) {
      throw new Error("Cannot delete studio with active bookings");
    } else {
      await StudioModel.findByIdAndUpdate(id, { $set: { isDeleted: true } });
      await StudioBookingModel.deleteMany({
        studioId: id,
        status: { $eq: "Empty" },
      });
    }

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const deleteBookingSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.query as any;
    if (!id) {
      throw new Error("Booking Id is required");
    }

    const checkExist = await StudioBookingModel.findById(id);
    if (!checkExist) {
      throw new Error("Studio does not exist");
    }
    if (checkExist.status === "Booked") {
      throw new Error(`Please first reschedule the booking to delete`);
    } else {
      await StudioBookingModel.findOneAndDelete(id);
    }

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const addShootFeatures = async (req: Request, res: Response) => {
  try {
    const {
      shootPolicy,
      shootGoals,
      shootFormat,
      vibes,
      addOnFeatures,
      canBringOutfits,
    } = req.body as any;

    await PlatformInfoModel.findOneAndUpdate(
      {},
      {
        shootPolicy,
        shootGoals,
        shootFormat,
        vibes,
        addOnFeatures,
        canBringOutfits,
      }
    );

    return OK(res, { ...req.body }, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getShootFeatures = async (req: Request, res: Response) => {
  try {
    const data = await PlatformInfoModel.findOne().select(
      "shootPolicy shootGoals shootFormat vibes addOnFeatures canBringOutfits"
    );

    return OK(res, data || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getActivities = async (req: Request, res: Response) => {
  try {
    let {
      type = "Upcoming",
      page = 1,
      limit = 10,
      search = "",
    } = req.query as any;

    if (!["Upcoming", "Past", "Reviewed", "Cancelled"].includes(type)) {
      throw new Error("Invalid type");
    }

    page = Math.max(Number(page), 1);
    limit = Math.min(Number(limit), 50);
    const skip = (page - 1) * limit;
    const now = new Date();

    if (type === "Cancelled") {
      const filter: any = { status: "Cancelled" };
      const searchRegex = search ? new RegExp(search, "i") : null;
      let sort: any = { time: 1 };

      const data = await CancelBooking2Model.find(filter)
        .populate({ path: "userId", select: "fullName" })
        .populate({ path: "studioId", select: "name" })
        .select(
          "activityType date startTime endtime userId studioId cancelledBy"
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const filteredData = searchRegex
        ? data.filter(
            (d: any) =>
              searchRegex.test(d.activityType) ||
              searchRegex.test(d.userId?.fullName || "") ||
              searchRegex.test(d.studioId?.name || "")
          )
        : data;

      const total = searchRegex
        ? filteredData.length
        : await CancelBooking2Model.countDocuments(filter);

      return OK(
        res,
        {
          data: filteredData,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        req.body.language || "en"
      );
    }

    const filter: any = { status: "Booked" };
    let sort: any = { time: 1 };

    if (type === "Upcoming") {
      filter.time = { $gt: now };
      sort.time = 1;
      filter.status = "Booked";
    }

    if (type === "Past") {
      filter.time = { $lt: now };
      sort.time = -1;
      filter.status = "Booked";
    }

    if (type === "Reviewed") {
      filter.time = { $lt: now };
      filter.attended = { $ne: null };
      filter.status = "Booked";
      sort.time = -1;
    }

    const searchRegex = search ? new RegExp(search, "i") : null;

    const data = await StudioBookingModel.find(filter)
      .populate({ path: "userId", select: "fullName" })
      .populate({ path: "studioId", select: "name" })
      .select("activityType date startTime endtime userId studioId")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const filteredData = searchRegex
      ? data.filter(
          (d: any) =>
            searchRegex.test(d.activityType) ||
            searchRegex.test(d.userId?.fullName || "") ||
            searchRegex.test(d.studioId?.name || "")
        )
      : data;

    const total = searchRegex
      ? filteredData.length
      : await StudioBookingModel.countDocuments(filter);

    return OK(
      res,
      {
        data: filteredData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      req.body.language || "en"
    );
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language || "en")
      : INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const giveRatings = async (req: Request, res: Response) => {
  try {
    let { slotId, attended, rating, images, comments } = req.body as any;

    const checkExist = await StudioBookingModel.findOne({
      _id: slotId,
      status: "Booked",
    });

    if (!checkExist) {
      throw new Error("Booking not found");
    }

    await StudioBookingModel.findByIdAndUpdate(slotId, {
      $set: {
        attended,
        rating,
        images,
        comments,
      },
    });

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language || "en")
      : INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    let { slotId, comments } = req.body as any;

    const checkExist = await StudioBookingModel.findOne({
      _id: slotId,
      status: "Booked",
    }).lean();

    if (!checkExist) {
      throw new Error("Booking not found");
    }

    await StudioBookingModel.findOneAndUpdate(
      { _id: slotId, status: "Booked" },
      {
        $set: {
          userId: null,
          activityType: null,
          addOnFeatures: [],
          shootFormat: "",
          shootGoals: "",
          vibes: "",
          canBringOutfits: 0,
          status: "Empty",
        },
      }
    );

    await CancelBooking2Model.create({
      ...checkExist,
      cancelledBy: "ADMIN",
      comments,
      status: "Cancelled",
    });

    return OK(res, {}, req.body.language || "en");
  } catch (err: any) {
    return err.message
      ? BADREQUEST(res, err.message, req.body.language || "en")
      : INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
