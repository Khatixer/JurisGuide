import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserOperations } from '../database/operations';
import { User, UserProfile, UserPreferences, Location, NotificationSettings } from '../types';
import { 
  authenticateToken, 
  generateToken, 
  validateUserPreferences,
  AuthenticatedRequest 
} from '../middleware/auth';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateEmail, validatePassword } from '../utils/validation';

const router = express.Router();

// Registration with enhanced profile
router.post('/register', validateUserPreferences, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      location,
      culturalBackground = 'western',
      preferredLanguage = 'en',
      timezone = 'UTC',
      communicationStyle = 'formal',
      notificationSettings = {
        email: true,
        sms: false,
        push: true,
        frequency: 'immediate'
      },
      privacyLevel = 'medium'
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Email, password, first name, and last name are required',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      res.status(400).json(createErrorResponse(
        'INVALID_EMAIL',
        'Invalid email format',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json(createErrorResponse(
        'WEAK_PASSWORD',
        passwordValidation.message,
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Check if user already exists
    const existingUser = await UserOperations.findByEmail(email);
    if (existingUser) {
      res.status(409).json(createErrorResponse(
        'EMAIL_EXISTS',
        'Email already registered',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user profile
    const profile: UserProfile = {
      firstName,
      lastName,
      location: location || {
        latitude: 0,
        longitude: 0,
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      culturalBackground,
      preferredLanguage,
      timezone
    };

    // Create user preferences
    const preferences: UserPreferences = {
      communicationStyle: communicationStyle as 'formal' | 'casual',
      notificationSettings: notificationSettings as NotificationSettings,
      privacyLevel: privacyLevel as 'high' | 'medium' | 'low'
    };

    // Create user
    const newUser = await UserOperations.create({
      email,
      passwordHash,
      profile,
      preferences
    });

    // Generate JWT token
    const token = generateToken(newUser, 'user');

    // Return success response (exclude password hash)
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      profile: newUser.profile,
      preferences: newUser.preferences,
      createdAt: newUser.createdAt
    };

    res.status(201).json(createSuccessResponse(
      {
        message: 'User registered successfully',
        token,
        user: userResponse
      },
      req.headers['x-request-id'] as string
    ));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createErrorResponse(
      'REGISTRATION_ERROR',
      'Failed to register user',
      req.headers['x-request-id'] as string
    ));
  }
});

// Login with enhanced user data
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json(createErrorResponse(
        'MISSING_CREDENTIALS',
        'Email and password are required',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Find user by email
    const user = await UserOperations.findByEmail(email);
    if (!user) {
      res.status(401).json(createErrorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json(createErrorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Generate JWT token
    const token = generateToken(user, 'user');

    // Return success response (exclude password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(createSuccessResponse(
      {
        message: 'Login successful',
        token,
        user: userResponse
      },
      req.headers['x-request-id'] as string
    ));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse(
      'LOGIN_ERROR',
      'Failed to login',
      req.headers['x-request-id'] as string
    ));
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await UserOperations.findById(req.user!.userId);
    
    if (!user) {
      res.status(404).json(createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Return user profile (exclude password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(createSuccessResponse(
      userResponse,
      req.headers['x-request-id'] as string
    ));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(createErrorResponse(
      'PROFILE_ERROR',
      'Failed to get user profile',
      req.headers['x-request-id'] as string
    ));
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateUserPreferences, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      firstName,
      lastName,
      location,
      culturalBackground,
      preferredLanguage,
      timezone
    } = req.body;

    // Get current user
    const currentUser = await UserOperations.findById(userId);
    if (!currentUser) {
      res.status(404).json(createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Update profile fields
    const updatedProfile: UserProfile = {
      ...currentUser.profile,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(location && { location }),
      ...(culturalBackground && { culturalBackground }),
      ...(preferredLanguage && { preferredLanguage }),
      ...(timezone && { timezone })
    };

    // Update user
    const updatedUser = await UserOperations.update(userId, {
      profile: updatedProfile
    });

    if (!updatedUser) {
      res.status(500).json(createErrorResponse(
        'UPDATE_FAILED',
        'Failed to update profile',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Return updated user (exclude password hash)
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      profile: updatedUser.profile,
      preferences: updatedUser.preferences,
      updatedAt: updatedUser.updatedAt
    };

    res.json(createSuccessResponse(
      {
        message: 'Profile updated successfully',
        user: userResponse
      },
      req.headers['x-request-id'] as string
    ));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(createErrorResponse(
      'UPDATE_ERROR',
      'Failed to update profile',
      req.headers['x-request-id'] as string
    ));
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      communicationStyle,
      notificationSettings,
      privacyLevel
    } = req.body;

    // Get current user
    const currentUser = await UserOperations.findById(userId);
    if (!currentUser) {
      res.status(404).json(createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Validate communication style
    if (communicationStyle && !['formal', 'casual'].includes(communicationStyle)) {
      res.status(400).json(createErrorResponse(
        'INVALID_COMMUNICATION_STYLE',
        'Communication style must be "formal" or "casual"',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Validate privacy level
    if (privacyLevel && !['high', 'medium', 'low'].includes(privacyLevel)) {
      res.status(400).json(createErrorResponse(
        'INVALID_PRIVACY_LEVEL',
        'Privacy level must be "high", "medium", or "low"',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Update preferences
    const updatedPreferences: UserPreferences = {
      ...currentUser.preferences,
      ...(communicationStyle && { communicationStyle }),
      ...(notificationSettings && { notificationSettings }),
      ...(privacyLevel && { privacyLevel })
    };

    // Update user
    const updatedUser = await UserOperations.update(userId, {
      preferences: updatedPreferences
    });

    if (!updatedUser) {
      res.status(500).json(createErrorResponse(
        'UPDATE_FAILED',
        'Failed to update preferences',
        req.headers['x-request-id'] as string
      ));
      return;
    }

    // Return updated user (exclude password hash)
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      profile: updatedUser.profile,
      preferences: updatedUser.preferences,
      updatedAt: updatedUser.updatedAt
    };

    res.json(createSuccessResponse(
      {
        message: 'Preferences updated successfully',
        user: userResponse
      },
      req.headers['x-request-id'] as string
    ));
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json(createErrorResponse(
      'UPDATE_ERROR',
      'Failed to update preferences',
      req.headers['x-request-id'] as string
    ));
  }
});

// Get supported languages and cultural backgrounds
router.get('/config', (req: Request, res: Response): void => {
  const config = {
    supportedLanguages: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'ar', name: 'العربية' },
      { code: 'hi', name: 'हिन्दी' }
    ],
    supportedCultures: [
      { code: 'western', name: 'Western' },
      { code: 'eastern', name: 'Eastern' },
      { code: 'latin', name: 'Latin American' },
      { code: 'african', name: 'African' },
      { code: 'middle_eastern', name: 'Middle Eastern' },
      { code: 'south_asian', name: 'South Asian' },
      { code: 'east_asian', name: 'East Asian' },
      { code: 'nordic', name: 'Nordic' },
      { code: 'mediterranean', name: 'Mediterranean' },
      { code: 'other', name: 'Other' }
    ],
    communicationStyles: [
      { code: 'formal', name: 'Formal' },
      { code: 'casual', name: 'Casual' }
    ],
    privacyLevels: [
      { code: 'high', name: 'High Privacy' },
      { code: 'medium', name: 'Medium Privacy' },
      { code: 'low', name: 'Low Privacy' }
    ]
  };

  res.json(createSuccessResponse(
    config,
    req.headers['x-request-id'] as string
  ));
});

export default router;