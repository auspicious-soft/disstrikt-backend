import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";
import { TaskResponseModel } from "src/models/admin/task-response";
import { TaskModel } from "src/models/admin/task-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { UserModel } from "src/models/user/user-schema";

export async function checkProfilePic(userId: any) {
  const checkData = await UserModel.findById(userId).lean();
  if (
    checkData?.image === null ||
    checkData?.image === "admin/images/cb4d721c-695a-4725-8369-eff28b5a967b.png"
  ) {
    return false;
  } else {
    return true;
  }
}
export async function checkBio(userId: any) {
  const checkData = await UserInfoModel.findOne(userId).lean();
  if (checkData?.aboutMe === null || checkData?.aboutMe === "") {
    return false;
  } else {
    return true;
  }
}
export async function checkPortfolioImage(userId: any, count: number) {
  const checkData = (await UserInfoModel.findOne(userId).lean()) as any;
  if (checkData?.portfolioImages?.length < count) {
    return false;
  } else {
    return true;
  }
}

export async function checkJobApply(userId: any, count: number) {
  const checkData = await AppliedJobModel.find({ userId }).countDocuments();
  if (checkData >= count) {
    return true;
  } else {
    return false;
  }
}

export async function checkJobSelected(userId: any, count: number) {
  const checkData = await AppliedJobModel.find({
    userId,
    status: "SELECTED",
  }).countDocuments();
  if (checkData >= count) {
    return true;
  } else {
    return false;
  }
}

export async function uploadToPortfolio(userId: any, taskNumber: number) {
  // Get previous task
  const previousTask = await TaskModel.findOne({
    taskNumber: taskNumber - 1,
  }).lean();

  if (!previousTask) {
    throw new Error("Previous task not found");
  }

  // Get response of previous task for this user
  const previousUploads = await TaskResponseModel.findOne({
    taskId: previousTask._id,
    userId,
  }).lean();

  // If no uploads, nothing to add
  const uploadData = previousUploads?.uploadLinks || [];
  if (uploadData.length === 0) return true;

  if (previousTask.taskType === "SET_CARD") {
    // Append to setCards
    await UserInfoModel.findOneAndUpdate(
      { userId },
      { $push: { setCards: { $each: uploadData } } },
      { new: true, upsert: true }
    );
  } else {
    // Append to portfolioImages
    await UserInfoModel.findOneAndUpdate(
      { userId },
      { $push: { portfolioImages: { $each: uploadData } } },
      { new: true, upsert: true }
    );
  }

  return true;
}
