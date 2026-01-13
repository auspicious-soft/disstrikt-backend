import { AppliedJobModel } from "src/models/admin/Applied-Jobs-schema";
import { TaskResponseModel } from "src/models/admin/task-response";
import { TaskModel } from "src/models/admin/task-schema";
import { UserInfoModel } from "src/models/user/user-info-schema";
import { UserModel } from "src/models/user/user-schema";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { uploadFileToS3 } from "src/config/s3";
import { configDotenv } from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import moment from "moment-timezone";

// for local machine
// ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
// ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");

configDotenv();

async function generateVideoThumbnail(
  videoUrl: string,
  userId: string,
  fileCategory = "thumbnails"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = `${uuid()}.jpg`;
    const localPath = path.join("/tmp", fileName);

    ffmpeg(videoUrl)
      .on("end", async () => {
        try {
          if (!fs.existsSync(localPath)) {
            return reject(new Error("Thumbnail was not generated"));
          }

          const fileBuffer = fs.readFileSync(localPath);

          const s3Result = (await uploadFileToS3(
            fileBuffer,
            fileName,
            "image/jpeg",
            userId,
            fileCategory,
            false
          )) as { Location?: string; key?: string };

          await fs.promises.unlink(localPath);

          // ✅ Use the actual S3 key that was stored
          if (!s3Result?.key) {
            return reject(new Error("S3 upload failed, no key returned"));
          }

          resolve(s3Result.key);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject)
      .screenshots({
        count: 1,
        filename: fileName,
        folder: "/tmp",
        size: "640x?",
      });
  });
}

export async function checkProfilePic(userId: any) {
  const checkData = await UserModel.findById(userId).lean();
  if (
    checkData?.image === null ||
    checkData?.image === "admin/images/dummy-image.png"
  ) {
    return false;
  } else {
    return true;
  }
}
export async function checkBio(userId: any) {
  const checkData = await UserInfoModel.findOne({ userId }).lean();
  if (checkData?.aboutMe === null || checkData?.aboutMe === "") {
    return false;
  } else {
    return true;
  }
}
export async function checkIntroVideo(userId: any) {
  const checkData = await UserInfoModel.findOne({ userId }).lean();

  if (checkData?.videos.find((val: any) => val.title === "introVideo")) {
    return true;
  } else {
    return false;
  }
}

export async function checkPortfolioImage(userId: any, count: number) {
  const checkData = (await UserInfoModel.findOne({ userId }).lean()) as any;
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

  const baseUrl = process.env.NEXT_PUBLIC_AWS_BUCKET_PATH;

  if (previousTask.answerType === "UPLOAD_VIDEO") {
    const thumbnailUrl = (await generateVideoThumbnail(
      `${baseUrl}${uploadData[0]}`,
      userId
    )) as any;

    await UserInfoModel.findOneAndUpdate(
      { userId },
      {
        $push: {
          videos: {
            $each: [
              {
                title: "other",
                url: uploadData[0], // full S3 file URL
                thumbnail: thumbnailUrl || "", // S3 key (or construct full URL if needed)
              },
            ],
          },
        },
      },
      { new: true, upsert: true }
    );

    return true;
  }

  if (previousTask.taskType === "SET_CARD") {
    // Append to setCards
    await UserInfoModel.findOneAndUpdate(
      { userId },
      { $set: { setCards: uploadData } },
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

export const convertToUTCFromMinutes = (
  date: string,
  minutes: number,
  timeZone: string
) => {
  const base = moment.tz(date, timeZone).startOf("day");
  return base.add(minutes, "minutes").utc().toDate();
};

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
