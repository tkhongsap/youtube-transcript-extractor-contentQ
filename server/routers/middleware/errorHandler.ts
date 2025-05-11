import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Centralized error handling middleware for router endpoints
 * Handles common error types and provides consistent error responses
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // If headers have already been sent, let the default Express error handler take over
  if (res.headersSent) {
    return next(err);
  }

  // Log the error for debugging purposes
  console.error(`Error in ${req.method} ${req.path}:`, err);

  // Handle specific error types
  if (err instanceof ZodError) {
    // Validation errors
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors
    });
  }

  // Handle errors with status codes
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    const message = err.message || 'An error occurred';
    return res.status(status).json({ message });
  }

  // Default to 500 Internal Server Error for unhandled errors
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error'
  });
} 