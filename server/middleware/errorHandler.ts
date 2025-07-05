import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error caught by middleware:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }

  // Handle errors with custom status codes
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // In development, include stack trace
  const errorResponse: any = {
    message,
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details;
  }

  res.status(statusCode).json(errorResponse);
}