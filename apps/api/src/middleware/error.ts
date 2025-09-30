import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getRequestId } from '../utils/request-context';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = getRequestId();
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  logger.error(
    {
      err,
      requestId,
      path: req.path,
      method: req.method,
      statusCode,
    },
    'Request error'
  );

  res.status(statusCode).json({
    error: {
      message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = getRequestId();
  res.status(404).json({
    error: {
      message: 'Resource not found',
      path: req.path,
      requestId,
    },
  });
};