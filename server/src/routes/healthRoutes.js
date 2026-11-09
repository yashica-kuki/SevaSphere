import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SevaSphere backend is running successfully.",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

export default router;