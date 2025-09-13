import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserOperations } from '../database/operations';
import { User } from '../types';
import { createErrorResponse } from '../utils/response';

// Extended request interface to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
    profile?: User['profile'];
    preferences?: User['preferences'];
  };
}

// Enhanced JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Middleware to verify JWT token and load user profile
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json(createErrorResponse(
        'AUTH_TOKEN_REQUIRED',
        'Access token required',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Load full user data including profile and preferences
    const user = await UserOperations.findById(decoded.userId);
    
    if (!user) {
      res.status(403).json(createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Attach user data to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: decoded.role,
      profile: user.profile,
      preferences: user.preferences
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json(createErrorResponse(
        'INVALID_TOKEN',
        'Invalid or expired token',
        req.headers['x-request-id'] as string
      ));
    } else {
      res.status(500).json(createErrorResponse(
        'AUTH_ERROR',
        'Authentication error',
        req.headers['x-request-id'] as string
      ));
    }
  }
};

// Middleware to check if user has admin role
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json(createErrorResponse(
      'ADMIN_REQUIRED',
      'Admin access required',
      req.headers['x-request-id'] as string
    ));
    return;
  }
  next();
};

// Middleware to check if user has department or admin role
export const requireDepartmentOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'department' && req.user?.role !== 'admin') {
    res.status(403).json(createErrorResponse(
      'DEPARTMENT_ACCESS_REQUIRED',
      'Department or admin access required',
      req.headers['x-request-id'] as string
    ));
    return;
  }
  next();
};

// Middleware to check if user has lawyer role
export const requireLawyer = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'lawyer' && req.user?.role !== 'admin') {
    res.status(403).json(createErrorResponse(
      'LAWYER_ACCESS_REQUIRED',
      'Lawyer access required',
      req.headers['x-request-id'] as string
    ));
    return;
  }
  next();
};

// Middleware to validate cultural background and language preferences
export const validateUserPreferences = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const { culturalBackground, preferredLanguage } = req.body;

  // List of supported languages (can be moved to config)
  const supportedLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'
  ];

  // List of supported cultural backgrounds (can be moved to config)
  const supportedCultures = [
    'western', 'eastern', 'latin', 'african', 'middle_eastern', 'south_asian',
    'east_asian', 'nordic', 'mediterranean', 'other'
  ];

  if (preferredLanguage && !supportedLanguages.includes(preferredLanguage)) {
    res.status(400).json(createErrorResponse(
      'INVALID_LANGUAGE',
      `Unsupported language: ${preferredLanguage}`,
      req.headers['x-request-id'] as string
    ));
    return;
  }

  if (culturalBackground && !supportedCultures.includes(culturalBackground)) {
    res.status(400).json(createErrorResponse(
      'INVALID_CULTURAL_BACKGROUND',
      `Unsupported cultural background: ${culturalBackground}`,
      req.headers['x-request-id'] as string
    ));
    return;
  }

  next();
};

// Helper function to generate JWT token with user data
export const generateToken = (user: User, role?: string): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: role || 'user'
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

// Helper function to extract user preferences for cultural adaptation
export const getUserCulturalContext = (req: AuthenticatedRequest): {
  language: string;
  culturalBackground: string;
  communicationStyle: string;
} => {
  const defaultContext = {
    language: 'en',
    culturalBackground: 'western',
    communicationStyle: 'formal'
  };

  if (!req.user?.preferences || !req.user?.profile) {
    return defaultContext;
  }

  return {
    language: req.user.profile.preferredLanguage || defaultContext.language,
    culturalBackground: req.user.profile.culturalBackground || defaultContext.culturalBackground,
    communicationStyle: req.user.preferences.communicationStyle || defaultContext.communicationStyle
  };
};