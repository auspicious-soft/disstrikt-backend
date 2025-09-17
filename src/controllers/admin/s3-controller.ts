import { Request, Response } from "express";
import multer from "multer";
import { uploadFileToS3 } from "src/config/s3";
import { BADREQUEST, CREATED, INTERNAL_SERVER_ERROR } from "src/utils/response";

const storage = multer.memoryStorage();
export const multerUpload = multer({
  storage,
  limits: { fileSize: 1000 * 1024 * 1024 },
}).single("file");

export const uploadToS3 = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const file = req.file;
    const { role, _id } = userData || { role: "USER" };
    const {
      id = role === "ADMIN" ? _id : userData.userId,
      isAdmin = role === "ADMIN" ? true : false,
      language = "en",
    } = userData || { id: null, isAdmin: true, language: "en" };

    if (!file || !id) {
      return BADREQUEST(res, "Missing file or user", language);
    }

    const mime = file.mimetype;

    // Dynamically extract file category (top-level MIME type)
    let fileCategory: string;
    if (mime.includes("/")) {
      fileCategory = mime.split("/")[0]; // e.g. "image", "video", "application", "text"
    } else {
      fileCategory = "other"; // fallback
    }

    // Optionally map some common extensions if needed
    const allowedCategories = [
      "image",
      "video",
      "application",
      "text",
      "audio",
    ];
    if (!allowedCategories.includes(fileCategory)) {
      fileCategory = "other";
    }

    const result = await uploadFileToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      id,
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
