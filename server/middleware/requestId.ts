import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Set the request ID in headers for both request and response
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  
  next();
}