import { Request, Response } from "express";
import multer from "multer";
import { uploadFileToS3 } from "src/config/s3";
import { BADREQUEST, CREATED, INTERNAL_SERVER_ERROR } from "src/utils/response";

const storage = multer.memoryStorage();
export const multerUpload = multer({ storage }).single("file");
export const uploadToS3 = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const file = req.file;
    const { id: userId, isAdmin = false, language = "en" } = userData;

    if (!file || !userId) {
      return BADREQUEST(res, "Missing file or userId", language);
    }

    const mime = file.mimetype;

    let fileCategory: "image" | "video";
    if (mime.startsWith("image/")) {
      fileCategory = "image";
    } else if (mime.startsWith("video/")) {
      fileCategory = "video";
    } else {
      return BADREQUEST(res, "Unsupported file type", language);
    }

    const result = await uploadFileToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      userId,
      fileCategory,
      isAdmin === "true" || isAdmin === true
    );

    return CREATED(res, result, language);
  } catch (err: any) {
    console.error("S3 Upload Error:", err);
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};


