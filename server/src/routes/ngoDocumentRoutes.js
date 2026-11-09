
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import uploadNGODocument from "../middleware/ngoDocumentUpload.js";

import {
  getNGODocuments,
  uploadNGODocumentFile,
  downloadNGODocument,
} from "../controllers/ngoDocumentController.js";

const router = express.Router();

router.use(protect, authorize("NGO"));

router.get("/", getNGODocuments);

router.post(
  "/",
  (req, res, next) => {
    uploadNGODocument.single("document")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Document must be 5 MB or smaller."
              : error.message,
        });
      }

      next();
    });
  },
  uploadNGODocumentFile
);

router.get("/:documentId/download", downloadNGODocument);

export default router;
