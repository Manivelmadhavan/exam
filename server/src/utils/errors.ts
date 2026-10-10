export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const badRequest = (message: string, errorCode = 'BAD_REQUEST', details?: unknown) =>
  new AppError(400, errorCode, message, details);
export const unauthorized = (message = 'Authentication required', errorCode = 'UNAUTHENTICATED') =>
  new AppError(401, errorCode, message);
export const forbidden = (message = 'Access denied', errorCode = 'FORBIDDEN') =>
  new AppError(403, errorCode, message);
export const notFound = (message = 'Resource not found', errorCode = 'NOT_FOUND') =>
  new AppError(404, errorCode, message);
export const conflict = (message: string, errorCode = 'CONFLICT') => new AppError(409, errorCode, message);
