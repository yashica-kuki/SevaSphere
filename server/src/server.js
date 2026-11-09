
import "dotenv/config";
import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { startScheduler, stopScheduler } from "./services/scheduleService.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await prisma.$connect();

    app.listen(PORT, () => {
      console.log(`SevaSphere API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      startScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

const shutdown = async () => {
  console.log("Shutting down server...");
  stopScheduler();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
