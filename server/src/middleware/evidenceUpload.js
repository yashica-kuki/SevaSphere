import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";

export const evidenceDirectory = path.resolve(process.cwd(), "private_uploads", "impact-evidence");
fs.mkdirSync(evidenceDirectory, { recursive: true });

const allowed = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "video/mp4": ".mp4" };

// Stored under a random name with an extension derived from the verified MIME type (never the client's).
export default multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, evidenceDirectory),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${allowed[file.mimetype]}`),
  }),
  fileFilter: (req, file, cb) =>
    allowed[file.mimetype] ? cb(null, true) : cb(Object.assign(new Error("Only PDF, JPG, PNG or MP4 evidence is allowed."), { statusCode: 400 })),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
