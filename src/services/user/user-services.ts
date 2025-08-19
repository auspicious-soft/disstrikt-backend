import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { deleteFileFromS3 } from "src/config/s3";
import stripe from "src/config/stripe";
import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";
import { CheckboxModel } from "src/models/admin/checkbox-schema";
import { JobModel } from "src/models/admin/jobs-schema";
import { planModel } from "src/models/admin/plan-schema";
import { QuizModel } from "src/models/admin/quiz-schema";
import { TaskResponse } from "src/models/admin/task-response";
import { TaskModel } from "src/models/admin/task-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { UserModel } from "src/models/user/user-schema";
import { genders, languages } from "src/utils/constant";
import { generateToken, hashPassword, verifyPassword } from "src/utils/helper";

configDotenv();

export const homeServices = {
  getUserHome: async (payload: any) => {
    const { language, id, currentMilestone = 1 } = payload.userData;

    const { page = 1, limit = 10 } = payload; // 👈 pagination inputs

    const plan = await planModel
      .findById(payload.userData.subscription.planId)
      .lean();

    const skip = (page - 1) * limit;

    const result = await TaskModel.aggregate([
      {
        $match: {
          taskNumber: { $lte: plan?.fullAccess?.tasks },
          milestone: { $lte: currentMilestone },
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "taskresponses", // 👈 collection name for TaskResponse
          let: { taskNumber: "$taskNumber", milestone: "$milestone" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$taskNumber", "$$taskNumber"] },
                    { $eq: ["$milestone", "$$milestone"] },
                    { $eq: ["$taskReviewed", true] },
                  ],
                },
              },
            },
            { $limit: 1 }, // only need one matching response
          ],
          as: "response",
        },
      },
      {
        $addFields: {
          rating: { $ifNull: [{ $arrayElemAt: ["$response.rating", 0] }, 0] },
          attempted: { $gt: [{ $size: "$response" }, 0] }, // 👈 true if response exists
        },
      },
      {
        $project: {
          taskType: 1,
          answerType: 1,
          taskNumber: 1,
          milestone: 1,
          attempted: 1,
          title: `$${language}.title`,
          rating: 1,
        },
      },
      { $sort: { taskNumber: 1 } },
      {
        $facet: {
          tasks: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const tasks = result[0]?.tasks || [];
    // Group by milestone
    const groupedTasks = tasks.reduce((acc: any, task: any) => {
      const milestone = task.milestone;
      if (!acc[milestone]) {
        acc[milestone] = [];
      }
      acc[milestone].push(task);
      return acc;
    }, {});

    const total = result[0]?.meta[0]?.total || 0;

    const percentage =
      total > 0
        ? ((await TaskResponse.countDocuments({
            userId: id,
            milestone: { $eq: currentMilestone },
            taskReviewed: true,
          })) /
            total) *
          100
        : 0;

    return {
      plan: payload.userData.subscription.planName || null,
      milestone: currentMilestone,
      fullName: payload.userData.fullName,
      image: payload.userData.image,
      planName: payload.userData.subscription.planName,
      percentage: Number(percentage.toFixed(1)),
      milestone1: groupedTasks[1] || [],
      milestone2: groupedTasks[2] || [],
      milestone3: groupedTasks[3] || [],
      milestone4: groupedTasks[4] || [],
      milestone5: groupedTasks[5] || [],
      milestone6: groupedTasks[6] || [],
      milestone7: groupedTasks[7] || [],
      milestone8: groupedTasks[8] || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getTaskById: async (payload: any) => {
    const { taskId, userData } = payload;

    const task = (await TaskModel.findById(taskId)
      .select(
        `${userData.language} taskType answerType link taskNumber milestone`
      )
      .lean()) as any;

    if (!task) {
      throw new Error("taskNotFound");
    }

    let response = {
      ...task,
      ...task[userData.language],
    };

    if (task.taskType === "QUIZ") {
      const quizData = await QuizModel.aggregate([
        {
          $match: { taskId: new mongoose.Types.ObjectId(taskId) },
        },
        {
          $project: {
            taskId: 1,
            questionNumber: 1,
            answer:1,
            question: `$en.question`,
            option_A: `$en.option_A`,
            option_B: `$en.option_B`,
            option_C: `$en.option_C`,
            option_D: `$en.option_D`,
          },
        },
        {
          $sort: { questionNumber: 1 },
        },
      ]);
      response["quiz"] = quizData;
    }

    if (task.taskType == "CHECK_BOX") {
      const checkbox = (await CheckboxModel.findOne({ taskId }).lean()) as any;
      const data = checkbox[userData.language] || {};
      response["checkbox"] = data;
    }

    delete response[userData.language];

    return response;
  },

  submitTaskById: async (payload: any) => {
    const { taskId, userData, body } = payload;

    const taskData = await TaskModel.findById(taskId).lean();

    let checkResponse = await TaskResponse.findOne({
      userId: userData.id,
      taskId: taskId,
    });

    if (checkResponse) {
      throw new Error("taskAlreadySubmitted");
    }

    let finalQuiz = [] as any;
    let rating = 0;
    let checkBox = {} as any;
    let taskReviewed = false;
    let uploadLinks = [] as any;
    let text = "";

    if (taskData?.appReview) {
      taskReviewed = true;
      if (
        ["CALENDLY", "WRITE_SECTION", "DONE"].includes(
          taskData?.answerType || ""
        )
      ) {
        text = body.writeSection;
        rating = 3;
      }
      if (taskData?.answerType === "QUIZ") {
        const quizData = await QuizModel.find({ taskId }).lean();

        const quiz = body.quiz.map((data: any) => {
          const checkFrom = quizData.find((val: any) => val._id == data.quizId);
          if (data.answer == checkFrom?.answer) {
            return { ...data, isCorrect: true };
          } else {
            return { ...data, isCorrect: false };
          }
        });

        finalQuiz = quiz;
        const correctCount = quiz.filter((q: any) => q.isCorrect).length;
        const totalCount = quiz.length || 1; // avoid division by zero
        // Scale to 0–3
        rating = Math.round((correctCount / totalCount) * 3);
      }

      if (taskData?.answerType === "CHECK_BOX") {
        checkBox = body.checkbox;
        rating = 3;
      }

      if (
        ["UPLOAD_IMAGE", "UPLOAD_VIDEO", "UPLOAD_FILE"].includes(
          taskData?.answerType || ""
        )
      ) {
        uploadLinks = body.uploadLinks;
        rating = 3;
        text = body.writeSection;
      }
    } else {
      rating = 0;
      taskReviewed = false;
      uploadLinks = body.uploadLinks;
      text = body.writeSection;
    }

    await TaskResponse.updateOne(
      { userId: userData.id, taskId: taskId },
      {
        $set: {
          rating: rating,
          taskReviewed,
          quiz: finalQuiz,
          uploadLinks,
          checkBox,
          text,
          taskNumber: taskData?.taskNumber,
          milestone: taskData?.milestone,
          appReview: taskData?.appReview,
        },
      },
      { upsert: true }
    );

    return {};

    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
    // Switch Cases For All The Task Handling
  },
};

export const profileServices = {
  profile: async (payload: any) => {
    const { userData } = payload;
    const userJobs = await AppliedJobModel.find({ userId: userData.id }).lean();

    let selectedJobs = 0;

    for (let i = 0; i < userJobs.length; i++) {
      if (userJobs[i].status == "SELECTED") {
        selectedJobs += 1;
      }
    }

    return {
      fullName: userData.fullName,
      id: userData.id,
      image: userData.image,
      authType: userData.authType,
      milestone: 0,
      percentage: 0,
      taskCount: 0,
      appliedJobs: userJobs.length || 0,
      selectedJobs: selectedJobs,
    };
  },

  getUser: async (payload: any) => {
    const { fullName, phone, email, countryCode, image } = payload.userData;
    const additionalInfo = await UserInfoModel.findOne({
      userId: payload.userData.id,
    }).lean();

    const { dob, gender, measurements } = additionalInfo || {};

    return {
      _id: payload.userData.id,
      image,
      fullName,
      phone,
      email,
      countryCode,
      dob,
      gender,
      measurements,
      genders: genders,
    };
  },

  updateUser: async (payload: any) => {
    if (payload.image) {
      const data = await UserModel.findById(payload.id).lean();
      if (data && data.image) {
        await deleteFileFromS3(data?.image as string);
      }
    }
    const userInfo = await UserInfoModel.findOneAndUpdate(
      { userId: payload.id },
      {
        $set: {
          measurements: {
            heightCm: payload?.heightCm,
            bustCm: payload?.bustCm,
            waistCm: payload?.waistCm,
            hipsCm: payload?.hipsCm,
            weightKg: payload?.weightKg,
            shoeSizeUK: payload?.shoeSizeUK,
          },
          gender: payload?.gender,
          dob: payload?.dob,
        },
      },
      { new: true }
    ).lean();

    const user = await UserModel.findByIdAndUpdate(
      payload.id,
      {
        $set: {
          fullName: payload?.fullName,
          image: payload?.image,
        },
      },
      { new: true }
    ).lean();

    return {
      _id: payload.id,
      image: user?.image || "",
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      email: user?.email || "",
      countryCode: user?.countryCode || "",
      dob: userInfo?.dob || "",
      gender: userInfo?.gender || "",
      measurements: userInfo?.measurements || {},
      genders: genders,
    };
  },

  changePassword: async (payload: any) => {
    const { id, oldPassword, newPassword, language } = payload;

    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("userNotFound");
    }

    const passwordStatus = await verifyPassword(
      oldPassword,
      user?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }

    const updatedPassword = await hashPassword(newPassword);
    user.password = updatedPassword;
    await user.save();

    return {};
  },

  changeLanguage: async (payload: any) => {
    const { id, language } = payload;
    await UserModel.findByIdAndUpdate(
      id,
      { $set: { language } },
      { new: true }
    );
    return {};
  },

  changeCountry: async (payload: any) => {
    const { id, country } = payload;
    await UserModel.findByIdAndUpdate(id, { $set: { country } });
    return {};
  },

  updatePlan: async (payload: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const toDate = (timestamp?: number | null): Date | null =>
        typeof timestamp === "number" && !isNaN(timestamp)
          ? new Date(timestamp * 1000)
          : null;

      const { type, planId, userData } = payload;
      const { stripeCustomerId, currency, paymentMethodId, status } =
        userData.subscription;

      if (type == "cancelTrial" && status !== "trialing") {
        throw new Error("Your subscription is not Trailing");
      }
      if (type == "cancelSubscription") {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          }
        );

        await SubscriptionModel.findOneAndUpdate(
          {
            userId: userData.id,
            $or: [{ status: "active" }, { status: "trialing" }],
          },
          {
            $set: {
              status: "canceling",
            },
          },
          { session }
        );
      }

      if (type == "cancelTrial" && !planId) {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            trial_end: "now",
            proration_behavior: "none",
          }
        );
      }
      if (type == "cancelTrial" && planId) {
        await stripe.subscriptions.cancel(
          userData.subscription.stripeSubscriptionId
        );

        await SubscriptionModel.findByIdAndDelete(userData.subscription._id, {
          session,
        });
        const planData = await planModel.findById(planId).session(session);
        const newSub = await stripe.subscriptions.create({
          customer:
            typeof stripeCustomerId === "string"
              ? stripeCustomerId
              : stripeCustomerId?.id ?? "",
          items: [{ price: planData?.stripePrices[currency as "eur" | "gbp"] }],
          default_payment_method: paymentMethodId,
          expand: ["latest_invoice.payment_intent"],
        });

        const newSubPrice = newSub.items.data[0]?.price;

        await SubscriptionModel.create(
          [
            {
              userId: userData.id,
              stripeCustomerId,
              planId,
              stripeSubscriptionId: newSub.id,
              paymentMethodId,
              status: newSub.status,
              trialStart: toDate(newSub.trial_start),
              trialEnd: toDate(newSub.trial_end),
              startDate: toDate(newSub.start_date),
              currentPeriodStart: toDate(newSub.current_period_start),
              currentPeriodEnd: toDate(newSub.current_period_end),
              nextBillingDate: toDate(newSub.current_period_end),
              amount: newSubPrice?.unit_amount
                ? newSubPrice.unit_amount / 100
                : 0,
              currency: newSubPrice?.currency ?? "inr",
              nextPlanId: null,
            },
          ],
          { session }
        );
      }

      if (type == "upgrade") {
        await stripe.subscriptions.update(
          userData.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          }
        );

        await SubscriptionModel.findOneAndUpdate(
          {
            userId: userData.id,
          },
          {
            $set: {
              nextPlanId: planId,
            },
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
      return {};
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("badrequest");
    }
  },
};

export const portfolioServices = {
  userPortfolio: async (payload: any) => {
    const { userData } = payload;
    const portfolio = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const {
      aboutMe,
      portfolioImages,
      links,
      videos,
      setCards,
      _id,
      measurements,
      gender,
      dob,
    } = portfolio as any;

    const response = {
      userId: userData.id,
      _id,
      fullName: userData.fullName,
      image: userData.image,
      aboutMe,
      portfolioImages,
      links: links.length
        ? links
        : [
            {
              platform: "Instagram",
              url: "",
            },
            {
              platform: "Youtube",
              url: "",
            },
          ],
      videos,
      setCards,
      portfolioLink: `http://localhost:3000/${userData?.id}`,
      videoSections: ["introVideo", "catwalkVideo", "other"],
      measurements,
      gender,
      dob,
      country: userData.country,
      email: userData.email,
      phone: userData.phone,
    };

    return response;
  },

  updatePortfolio: async (payload: any) => {
    const { userData, data } = payload;

    const updateData = await UserInfoModel.findOneAndUpdate(
      { userId: userData.id },
      {
        aboutMe: data.aboutMe,
        links: data.links,
        setCards: data.setCards,
      },
      { new: true }
    );

    const response = {
      userId: userData.id,
      _id: updateData?._id,
      fullName: userData.fullName,
      image: userData.image,
      aboutMe: updateData?.aboutMe,
      portfolioImages: updateData?.portfolioImages,
      links: updateData?.links.length
        ? updateData.links
        : [
            {
              platform: "Instagram",
              url: "",
            },
            {
              platform: "Youtube",
              url: "",
            },
          ],
      videos: updateData?.videos,
      setCards: updateData?.setCards,
      portfolioLink: `http://localhost:3000/${userData?.id}`,
      videoSections: ["introVideo", "catwalkVideo", "other"],
    };

    return response;
  },

  addVideo: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    // checkExist?.videos?.map((info) => {
    //   if (info.title === data.title) {
    //     throw new Error("sectionExist");
    //   }
    // });

    checkExist?.videos.push({
      title: data.title,
      url: data.url,
      thumbnail: data.thumbnail,
    });

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { videos: checkExist?.videos },
    });

    return checkExist?.videos;
  },

  addImage: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const images = [...data.url, ...(checkExist?.portfolioImages || [])];

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: images },
    });

    return images;
  },

  deleteVideo: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    const udpateData = checkExist?.videos?.filter(
      (val: any) => val.url !== data.url
    );

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { videos: udpateData },
    });

    // ************************ Need to write code to remove video from S3 *************************

    await deleteFileFromS3(data.url);
    await deleteFileFromS3(data.thumbnail);

    return udpateData;
  },

  deleteImage: async (payload: any) => {
    const { userData, data } = payload;
    const checkExist = await UserInfoModel.findOne({
      userId: userData.id,
    }).lean();

    let newData = checkExist?.portfolioImages || [];

    for (let i = 0; i < data.url.length; i++) {
      newData = newData?.filter((val) => val !== data.url[i]);
    }

    await UserInfoModel.findByIdAndUpdate(checkExist?._id, {
      $set: { portfolioImages: newData },
    });

    // ************************ Need to write code to remove image from S3 *************************

    for (const url of data.url) {
      await deleteFileFromS3(url);
    }

    return newData;
  },
};

export const userJobServices = {
  async getJobs(payload: any) {
    const {
      sort,
      search,
      country,
      language = "en",
      page = "1",
      limit = "10",
      branch,
      gender,
      age,
      currency,
      type = "NEW",
      userId,
    } = payload;

    const filter: any = {};
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    if (country) filter.countryCode = country;

    if (search) {
      filter.$or = [
        { [`${language}.title`]: { $regex: search, $options: "i" } },
        { [`${language}.companyName`]: { $regex: search, $options: "i" } },
      ];
    }

    if (branch) filter[`en.branch`] = branch;
    if (gender) filter[`en.gender`] = gender;

    if (age) {
      const ageNumber = parseInt(age as string, 10);
      if (!isNaN(ageNumber)) {
        filter.minAge = { $lte: ageNumber };
        filter.maxAge = { $gte: ageNumber };
      }
    }

    let appliedJobMap = new Map<string, string>();

    if (userId && type === "APPLIED") {
      const appliedJobs = await AppliedJobModel.find({ userId });
      const appliedJobIds = appliedJobs.map((j) => j.jobId);
      appliedJobMap = new Map(
        appliedJobs.map((j) => [j.jobId.toString(), j.status])
      );
      filter._id = { $in: appliedJobIds };
    } else if (userId && type === "NEW") {
      const appliedJobs = await AppliedJobModel.find({ userId });
      const appliedJobIds = appliedJobs.map((j) => j.jobId);
      filter._id = { $nin: appliedJobIds };
      filter.date = { $gte: new Date().toUTCString() };
    }

    // Sorting
    let sortOption: any = {};
    switch (sort) {
      case "oldToNew":
        sortOption.date = 1;
        break;
      case "newToOld":
        sortOption.date = -1;
        break;
      case "highToLowPay":
        sortOption.pay = -1;
        break;
      case "lowToHighPay":
        sortOption.pay = 1;
        break;
    }

    // Fetch jobs
    const totalJobs = await JobModel.countDocuments(filter);
    const rawJobs = await JobModel.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    const jobs = rawJobs.map((job: any) => {
      const jobObj = job.toObject();
      const langFields = jobObj[language] || {};
      // remove other languages
      languages?.forEach((langKey) => delete jobObj[langKey]);

      const base = {
        ...jobObj,
        ...langFields,
      };

      // Add application status only for applied jobs
      if (type === "APPLIED") {
        base.status = appliedJobMap.get(jobObj._id.toString()) || "PENDING";
      }

      base.type = type;
      return base;
    });

    return {
      data: jobs,
      pagination: {
        total: totalJobs,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalJobs / limitNumber),
      },
    };
  },

  applyJobs: async (payload: any) => {
    const { jobId, id, gender } = payload;

    const isJobExpired = (jobDate: Date): boolean => {
      const now = new Date(); // current time in UTC
      return now > jobDate;
    };

    //*********************
    //Will call validation helpers based on users plan later.
    //*********************

    const checkApplication = await AppliedJobModel.findOne({
      jobId,
      userId: id,
    });
    const checkJob = await JobModel.findById(jobId).lean();

    if (!checkJob) {
      throw new Error("Invalid job Id");
    }
    if (checkApplication) {
      throw new Error("requestAlreadyExist");
    }

    if (checkJob?.en?.gender !== gender) {
      throw new Error("invalidGender");
    }

    if (isJobExpired(checkJob?.date || new Date())) {
      throw new Error("jobExpired");
    } else {
      await JobModel.updateOne(
        { _id: jobId },
        { $addToSet: { appliedUsers: id } } // avoids duplicates
      );
      await AppliedJobModel.create({
        jobId,
        userId: id,
      });
      return {};
    }
  },

  getJobById: async (payload: any) => {
    const { jobId, language, id } = payload;
    const data = (await JobModel.findById(jobId).lean()) as any;
    const response = {
      ...data[language],
      minAge: data.minAge,
      maxAge: data.maxAge,
      date: data.date,
      time: data.time,
      pay: data.pay,
      currency: data.currency,
      countryCode: data.countryCode,
      appliedUsers: data.appliedUsers,
      minHeightInCm: data.minHeightInCm,
    };

    const status = await AppliedJobModel.findOne({ userId: id, jobId: jobId });

    return {
      ...response,
      type: status ? "APPLIED" : "NEW",
      status: status?.status || null,
    };
  },
};

export const userSearchServices = {
  searchUsers: async (payload: any) => {
    const { userData, req } = payload;
    const { page = 1, limit = 10, search } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    let queryPipeline: any[] = [];

    const filter: any = {};

    if (search) {
      queryPipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
      });
    } else {
      queryPipeline.push(
        { $match: {} },
        {
          $addFields: {
            priority: {
              $cond: [{ $eq: ["$country", userData.country] }, 0, 1],
            },
          },
        },
        { $sort: { priority: 1 } } // Same-country first
      );
    }

    queryPipeline.push(
      { $skip: skip },
      { $limit: limitNumber },
      {
        $project: {
          _id: 1,
          fullName: 1,
          image: 1,
          country: 1,
        },
      }
    );

    const response = await UserModel.aggregate(queryPipeline);
    const total = search
      ? await UserModel.countDocuments({
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        })
      : await UserModel.countDocuments({});

    //Need to put a logic to find popular users which has completed most tasks later when this is implemented
    //Need to put a logic to find popular users which has completed most tasks later when this is implemented
    //Need to put a logic to find popular users which has completed most tasks later when this is implemented
    //Need to put a logic to find popular users which has completed most tasks later when this is implemented
    //Need to put a logic to find popular users which has completed most tasks later when this is implemented
    //Need to put a logic to find popular users which has completed most tasks later when this is implemented

    return {
      data: response,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  },
};
