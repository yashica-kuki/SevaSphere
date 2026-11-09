import prisma from "../config/prisma.js";

export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanName.length > 100 || cleanEmail.length > 255 ||
        cleanSubject.length > 150 || cleanMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been received successfully.",
      data: contactMessage,
    });
  } catch (error) {
    next(error);
  }
};