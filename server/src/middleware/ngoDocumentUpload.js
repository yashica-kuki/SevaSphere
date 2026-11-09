
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private_uploads",
  "ngo-documents"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only PDF, JPG and PNG documents are allowed.")
    );
  }

  callback(null, true);
};

const uploadNGODocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export default uploadNGODocument;
