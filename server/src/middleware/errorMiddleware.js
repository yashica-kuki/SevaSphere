
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || res.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors;

  if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation failed";
    errors = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  }

  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  }

  if (err.code === "P2002") {
    statusCode = 409;
    message = "A record with this information already exists";
  }

  if (err.code === "P2003") {
    statusCode = 400;
    message = "Invalid related record";
  }

  if (statusCode < 400) statusCode = 500;

  // Never leak internals for unexpected server errors in production.
  if (statusCode >= 500 && process.env.NODE_ENV === "production" && !err.statusCode) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === "development"
      ? { stack: err.stack }
      : {}),
  });
};
