import { Response } from 'express';
import { ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4()
  };
}

export function createErrorResponse(
  code: string, 
  message: string, 
  details?: any, 
  requestId?: string
): ApiResponse<null> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4()
  };
}

export function sendSuccess<T>(
  res: Response, 
  data: T, 
  statusCode: number = 200,
  requestId?: string
): void {
  res.status(statusCode).json(createSuccessResponse(data, requestId));
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any,
  requestId?: string
): void {
  res.status(statusCode).json(createErrorResponse(code, message, details, requestId));
}

// Common error responses
export function sendValidationError(
  res: Response, 
  errors: string[], 
  requestId?: string
): void {
  sendError(
    res,
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    { errors },
    requestId
  );
}

export function sendNotFoundError(
  res: Response, 
  resource: string = 'Resource',
  requestId?: string
): void {
  sendError(
    res,
    'NOT_FOUND',
    `${resource} not found`,
    404,
    undefined,
    requestId
  );
}

export function sendUnauthorizedError(
  res: Response,
  message: string = 'Unauthorized access',
  requestId?: string
): void {
  sendError(
    res,
    'UNAUTHORIZED',
    message,
    401,
    undefined,
    requestId
  );
}

export function sendForbiddenError(
  res: Response,
  message: string = 'Access forbidden',
  requestId?: string
): void {
  sendError(
    res,
    'FORBIDDEN',
    message,
    403,
    undefined,
    requestId
  );
}

export function sendInternalServerError(
  res: Response,
  message: string = 'Internal server error',
  requestId?: string
): void {
  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    message,
    500,
    undefined,
    requestId
  );
}

export function sendRateLimitError(
  res: Response,
  requestId?: string
): void {
  sendError(
    res,
    'RATE_LIMIT_EXCEEDED',
    'Too many requests, please try again later',
    429,
    undefined,
    requestId
  );
}

// Legacy function names for backward compatibility
export const successResponse = sendSuccess;
export const errorResponse = sendError;