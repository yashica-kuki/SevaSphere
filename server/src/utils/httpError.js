export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
export const badRequest = (m, d) => new HttpError(400, m, d);
export const notFound = (m = "Not found") => new HttpError(404, m);
export const forbidden = (m = "Forbidden") => new HttpError(403, m);
export const conflict = (m, d) => new HttpError(409, m, d);
