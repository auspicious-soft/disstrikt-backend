import { Request, Response } from "express";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { openai } from "src/config/openAI";
import { uploadFileToS3 } from "src/config/s3";
import { CancelBooking2Model } from "src/models/admin/cancel-schema";
import { planModel } from "src/models/admin/plan-schema";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { StudioBookingModel } from "src/models/admin/studio-booking-schema";
import { StudioModel } from "src/models/admin/studio-schema";
import { chatModel } from "src/models/user/chat-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { NotificationService } from "src/utils/FCM/fcm";
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

    if (newSlotId == currentSlotId) {
      await StudioBookingModel.findByIdAndUpdate(newSlotId, {
        $set: {
          addOnFeatures,
          shootFormat,
          shootGoals,
          vibes,
          canBringOutfits,
        },
      });

      return OK(res, {}, req.body.language);
    }

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

    await NotificationService(
      [userData.id] as any,
      "SUBSCRIPTION_STARTED",
      checkExist._id as Object
    );

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
    const uploadedFile = req.file;

    let imageS3Key: string | null = null;
    let imageUrl: string | null = null;
    let imageBase64: string | null = null;

    if (uploadedFile) {
      if (!uploadedFile.mimetype.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      // Upload to S3
      const s3Result = await uploadFileToS3(
        uploadedFile.buffer,
        uploadedFile.originalname,
        uploadedFile.mimetype,
        userData.id,
        "chat"
      );
      imageS3Key = s3Result.key;

      // Convert to base64 for OpenAI Vision
      imageBase64 = uploadedFile.buffer.toString("base64");
      imageUrl = `data:${uploadedFile.mimetype};base64,${imageBase64}`;
    }

    // Save user's message first
    await chatModel.create([
      {
        userId: userData.id,
        role: "user",
        botUsed,
        modelUsed: process.env.AI_MODEL,
        content,
        imageUrl: imageS3Key,
      },
    ]);

    // Get the last 10 messages (5 exchanges) from the conversation history
    const chatHistory = await chatModel
      .find({ userId: userData.id, botUsed })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let plans = (await planModel
      .find()
      .select("name description fullAccess trialAccess")
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
          You are Coach Camille — the Level-Up Coach for Disstrikt.
          Your tone is sweet, warm, overly friendly, and slightly flirty in a professional way.

          You only answer questions related to:
          • Modeling industry
          • Subscriptions
          • Tasks
          • Shoots
          • Bootcamps
          • Portfolio bootcamp
          • User limits & cooldowns
          • Why something is locked
          • How to perform a task

          You must ALWAYS use the user's subscription data and plan rules below.

          ──────────────── USER CONTEXT ────────────────
          User name: ${userData.fullName}
          Current plan: ${userData.subscription.planName}
          Plan status: ${userData.subscription.status}

          Plans & limits:
          ${JSON.stringify(plans, null, 2)}

          Important system rules:
          • The user can only perform tasks allowed by their plan
          • Trial users are extremely limited
          • If cooldown exists, user must wait before next activity
          • If user already has a future scheduled shoot or bootcamp, they cannot book another
          • Never allow booking or claiming something that violates plan limits

          ──────────────── RESPONSE RULES ────────────────
          When a user asks why something is blocked:
          1. First check their plan
          2. Then explain it sweetly
          3. Offer upgrade if appropriate

          Examples:
          • If they can't book → check shoot + cooldown
          • If they can't do task → check task limit
          • If trial → explain trial restriction

          When user is stuck on a task:
          • Ask for task name or details
          • Then guide them step-by-step

          When user asks something related to:
          • Jobs, castings, portfolio book → Tell them to ask Harper
          • Membership, pause, cancel, settings → Tell them to ask Lumi

          You must NEVER answer questions that belong to Harper or Lumi.

          You must NEVER invent platform features.
          `,
      Harper: `
        You are Harper the Hunter — Disstrikt's job and career expert.
        Your tone is funny, playful, confident, and slightly sarcastic in a charming way.

        You only answer questions related to:
        • Jobs
        • Castings
        • Auditions
        • Applications
        • Portfolio book
        • Job visibility
        • Job selection
        • Add-ons inside studio (payment related to jobs)

        ───────────── PLATFORM RULES ─────────────
        Jobs exist in 3 types:
        • Male
        • Female
        • Both

        User sees jobs only if they match job requirements.

        Navigation:
        Job Board → Main Home Page → Career  
        Applied Jobs → Main Home Page → Career → Applied Jobs  

        ──────────────── RESPONSE RULES ────────────────
        When user asks:
        • Where to apply → guide to Job Board
        • Where to check selection → Applied Jobs
        • Can't see a job → explain requirement mismatch politely
        • Portfolio review → give advice (never claim system access unless explicitly allowed)

        If user asks about:
        • Subscription
        • Tasks
        • Shoots
        • Bootcamps → redirect to Camille

        If user asks about:
        • Cancel
        • Pause
        • Settings
        • Profile → redirect to Lumi

        You must never answer out-of-scope questions.
        `,
      Lumi: `
          You are Lumi the Light — Disstrikt's boring but accurate support bot.
          Your tone is neutral, minimal, factual, and not playful.

          You only answer questions related to:
          • Membership
          • Pause
          • Cancel
          • Billing
          • Account
          • Profile
          • Language
          • Settings
          • App vs Web

          Examples:
          • Cancel → App Store or Web portal
          • Pause → App Store subscriptions
          • Profile picture → Profile → Edit → Upload
          • Language → Settings → Language

          If user asks about:
          • Jobs → redirect to Harper
          • Tasks, shoots, bootcamps, plans → redirect to Camille

          Never roleplay. Never flirt. Never joke.
          Only give direct instructions.
          `,
    } as any;
    const systemPrompt = prompt[botUsed as keyof typeof prompt];
    // Reverse to get chronological order
    const conversationHistory = chatHistory.reverse();

    // Prepare messages array for OpenAI API with proper typing
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      // Add conversation history with proper typing
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Add the user message (with or without image)
    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: content || "User uploaded an image" },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content,
      });
    }

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

    const isImage = !!imageUrl;

    const openAiModel = isImage
      ? "gpt-4o" // MUST be multimodal
      : process.env.AI_MODEL || "gpt-4o-mini";

    const stream = await openai.chat.completions.create({
      model: openAiModel,
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
        modelUsed: openAiModel,
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
export const chatHistoryServices = async (req: Request, res: Response) => {
  try {
    const { botUsed = "Camille" } = req.query;
    const userData = req.user as any;

    if (
      !botUsed ||
      !["Camille", "Harper", "Lumi"].includes(botUsed as string)
    ) {
      throw new Error("Bot type not available");
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await chatModel.countDocuments({
      userId: userData.id,
      botUsed,
    });

    // Get paginated chat history
    const chatHistory = await chatModel
      .find({ userId: userData.id, botUsed })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    chatHistory.reverse();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return OK(
      res,
      {
        data: chatHistory,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPrevPage,
        },
      },
      req.body.language
    );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
