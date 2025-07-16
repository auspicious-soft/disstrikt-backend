// s3Service.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { config } from "dotenv";
config();

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
  NEXT_PUBLIC_AWS_BUCKET_PATH,
} = process.env;

export const createS3Client = () => {
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID as string,
      secretAccessKey: AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

// 🔼 Upload file directly to S3 from buffer
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimetype: string,
  userId: string,
  fileCategory: "image" | "video",
  isAdmin = false
) => {
  const ext = path.extname(originalName) || mimeToExt(mimetype);
  const fileName = `${uuidv4()}${ext}`;
  const folder = isAdmin
    ? `admin/${fileCategory}s`
    : `users/${userId}/${fileCategory}s`;

  const key = `${folder}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await createS3Client().send(command);

  return { key };
};

export const deleteFileFromS3 = async (key: string): Promise<boolean> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    });

    await createS3Client().send(command);
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
};

const mimeToExt = (mime: string) => {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
  };
  return map[mime] || ".bin";
};
