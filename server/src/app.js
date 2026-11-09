import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import ngoProfileRoutes from "./routes/ngoProfileRoutes.js";
import ngoDocumentRoutes from "./routes/ngoDocumentRoutes.js";
import adminVerificationRoutes from "./routes/adminVerificationRoutes.js";

import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import sharedRoutes from "./routes/sharedRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// BigInt (paise) values are serialised as numbers when safe, otherwise strings.
BigInt.prototype.toJSON = function toJSON() {
  return this <= BigInt(Number.MAX_SAFE_INTEGER) && this >= -BigInt(Number.MAX_SAFE_INTEGER) ? Number(this) : this.toString();
};

const app = express();
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SevaSphere API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/ngo", ngoProfileRoutes);
app.use("/api/ngo/documents", ngoDocumentRoutes);
app.use("/api/admin/ngo-verifications", adminVerificationRoutes);
app.use("/api/public/contact", contactRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", sharedRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;