import { Request, Response } from "express";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { openai } from "src/config/openAI";
import { CancelBooking2Model } from "src/models/admin/cancel-schema";
import { planModel } from "src/models/admin/plan-schema";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { StudioBookingModel } from "src/models/admin/studio-booking-schema";
import { StudioModel } from "src/models/admin/studio-schema";
import { chatModel } from "src/models/user/chat-schema";
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
          reason: "NO_ACCESS",
        },
        {
          type: "Skill Bootcamp",
          eligible: false,
          percentage: 0,
          daysLeft: null,
          reason: "NO_ACCESS",
        },
        {
          type: "Create a Shoot",
          eligible: false,
          percentage: 0,
          daysLeft: null,
          reason: "NO_ACCESS",
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
            reason: "CAN_ACCESS",
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
    const { type = "Upcoming" } = req.query as any;
    if (!["Upcoming", "Cancelled", "Previous"].includes(type)) {
      throw new Error("Invalid type");
    }
    let checkExist;
    const date = new Date();
    if (type == "Cancelled") {
      checkExist = await CancelBooking2Model.find({
        userId: userData.id,
      })
        .select(
          "activityType date time slot status startTime endtime attended cancelledBy"
        )
        .populate({ path: "studioId", select: "name" })
        .sort({ time: -1 });
    } else {
      checkExist = await StudioBookingModel.find({
        userId: userData.id,
        time: type === "Upcoming" ? { $gt: date } : { $lt: date },
      })
        .select(
          "activityType date time slot status startTime  endtime attended"
        )
        .populate({ path: "studioId", select: "name" })
        .sort({ time: -1 });
    }
    return OK(res, checkExist, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { slotId, type = null } = req.query;

    let checkExist;
    if (type === "Cancelled") {
      checkExist = await CancelBooking2Model.findOne({ slotId })
        .populate("studioId")
        .populate("userId");
    } else {
      checkExist = await StudioBookingModel.findById(slotId)
        .populate("studioId")
        .populate("userId");
    }

    return OK(res, checkExist, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const editBooking = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      currentSlotId,
      newSlotId,
      addOnFeatures = [],
      shootFormat = "",
      shootGoals = "",
      vibes = "",
      canBringOutfits = 0,
    } = req.body;

    const userData = req.user as any;

    // 1️⃣ Verify old booking belongs to user & is booked
    const oldBooking = await StudioBookingModel.findOne(
      {
        _id: currentSlotId,
        userId: userData.id,
        status: "Booked",
      },
      null,
      { session }
    );

    if (!oldBooking) {
      throw new Error("Invalid or unauthorized booking");
    }

    // 2️⃣ Atomically claim new slot
    const newBooking = await StudioBookingModel.findOneAndUpdate(
      {
        _id: newSlotId,
        status: "Empty",
      },
      {
        $set: {
          userId: userData.id,
          activityType: oldBooking.activityType,
          addOnFeatures,
          shootFormat,
          shootGoals,
          vibes,
          canBringOutfits,
          status: "Booked",
        },
      },
      { new: true, session }
    );

    if (!newBooking) {
      throw new Error("New slot is no longer available");
    }

    // 3️⃣ Release old slot
    await StudioBookingModel.updateOne(
      { _id: currentSlotId },
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
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return OK(res, newBooking, req.body.language);
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    return err.message
      ? BADREQUEST(res, err.message, req.body.language)
      : INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.query as any;

    const userData = req.user as any;

    const checkExist = await StudioBookingModel.findById(slotId).lean();
    if (!checkExist || checkExist.status !== "Booked") {
      throw new Error("Slot does not available");
    }

    const now = new Date();
    const diffInHours =
      (new Date(checkExist.time).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 48) {
      throw new Error(
        "Bookings cannot be cancelled within 48 hours of the scheduled time"
      );
    }

    await StudioBookingModel.findOneAndUpdate(
      { _id: slotId, userId: userData.id, status: "Booked" },
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
      cancelledBy: "USER",
      status: "Cancelled",
      userId: userData.id,
      slotId: checkExist._id,
      studioId: checkExist?.studioId,
      date: checkExist?.date,
      time: checkExist?.time,
      startTime: checkExist?.startTime,
      endtime: checkExist?.endtime,
      slot: checkExist?.slot,
      activityType: checkExist?.activityType,
    });

    return OK(res, {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const chatWithGPTServices = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { botUsed = null } = req.query;
    if (
      !botUsed ||
      !["Camille", "Harper", "Lumi"].includes(botUsed as string)
    ) {
      throw new Error("Bot type not available");
    }

    const { content } = req.body;
    // Save user's message first
    await chatModel.create([
      {
        userId: userData.id,
        role: "user",
        botUsed,
        modelUsed: process.env.AI_MODEL,
        content,
      },
    ]);

    //["Camille", "Harper", "Lumi"]

    // Get the last 10 messages (5 exchanges) from the conversation history
    const chatHistory = await chatModel
      .find({ userId: userData.id, botUsed })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let plans = (await planModel
      .find()
      .select("name description fullAccess")
      .lean()) as any;

    plans = plans.map((val: any) => {
      return {
        name: val.name.en,
        description: val.description,
        "Free trial access": `User can only do ${val.trialAccess.tasks}, that's it`,
        "Number of tasks allowed": val.fullAccess.tasks,
        "Can apply on jobs per day/month": `${val.fullAccess?.jobApplicationsPerDay}/${val.fullAccess?.jobApplicationsPerMonth}`,
        "Can attend skill bootcamp": `${val.fullAccess.skillBootcamp}`,
        "Cooldown period after skill bootcamp attended": `${val.fullAccess.skillCooling}`,
        "Can create a shoot": `${val.fullAccess.createAShoot}`,
        "Cooldown period after shoot attended": `${val.fullAccess.shootCooling}`,
        "Can attend portfolio bootcamp": `${val.fullAccess.portfolioBootcamp}`,
        "Cooldown period after portfolio bootcamp attended": `${val.fullAccess.portfolioCooling}`,
      };
    });

    const prompt = {
      Camille: `
      Your are Coach "Camille", Your tone is Sweet & overly friendly. You are going to chat with our models registered with our application Disstrikt. You will provide details general questions related to modeling industry and provide information about subscription and help them doing tasks if they stuck on any (You can ask users about the task datails in such cases). 
      Our subscriptions plans details are ${plans},
      User (${userData.fullName}) has current plan ${userData.subscription.planName} and status is ${userData.subscription.status}, 

      We have two other chat models name Harper and Lumi, Harper is to guid users on questions related to jobs in our platform. User has a portfolio book in our app where user upload photos and videos so Harper will guid them for that as well. On the other side Lumi is to answer basic platform questions regarding membership (Pause, cancel), changing settings like profile pic and language so if anything is asked related to these two other models let the users know about this so that user can ask other models.
      `,
      Harper: "",
      Lumi: "",
    } as any;

    // Reverse to get chronological order
    const conversationHistory = chatHistory.reverse();

    // Prepare messages array for OpenAI API with proper typing
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: prompt[botUsed as any] as string,
      },
      // Add conversation history with proper typing
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content !== content
    ) {
      messages.push({
        role: "user",
        content,
      });
    }

    // Set up streaming response to client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.8,
      stream: true,
      max_tokens: 800,
    });

    let fullResponse = "";

    // Process each chunk from the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
        fullResponse += content;
      }
    }

    // End the stream
    res.write("data: [DONE]\n\n");
    res.end();

    await chatModel.create([
      {
        userId: userData.id,
        role: "assistant",
        botUsed,
        modelUsed: process.env.AI_MODEL,
        content: fullResponse,
      },
    ]);

    return true;
  } catch (err) {
    console.error("Error in chat stream:", err);
    if (!res.headersSent) {
      return INTERNAL_SERVER_ERROR(res, req.body.language);
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
      );
      res.end();
      return true;
    }
  }
};
