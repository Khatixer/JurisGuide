import { LegalCategory, User, LegalQuery, Lawyer } from '../types';

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Alias for compatibility with auth routes
export function validateEmail(email: string): boolean {
  return isValidEmail(email);
}

// Password strength validation
export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Enhanced password validation with detailed feedback
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true, message: 'Password is valid' };
}

// Legal category validation
export function isValidLegalCategory(category: string): category is LegalCategory {
  const validCategories: LegalCategory[] = [
    'contract_dispute',
    'employment_law',
    'family_law',
    'criminal_law',
    'immigration_law',
    'intellectual_property',
    'real_estate',
    'personal_injury',
    'business_law',
    'tax_law',
    'other'
  ];
  return validCategories.includes(category as LegalCategory);
}

// Urgency level validation
export function isValidUrgency(urgency: string): urgency is 'low' | 'medium' | 'high' | 'critical' {
  return ['low', 'medium', 'high', 'critical'].includes(urgency);
}

// Language code validation (ISO 639-1)
export function isValidLanguageCode(code: string): boolean {
  const validCodes = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 
    'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 'no'
  ];
  return validCodes.includes(code);
}

// Jurisdiction validation
export function isValidJurisdiction(jurisdiction: string[]): boolean {
  if (!Array.isArray(jurisdiction) || jurisdiction.length === 0) {
    return false;
  }
  
  // Basic validation - each jurisdiction should be a non-empty string
  return jurisdiction.every(j => typeof j === 'string' && j.trim().length > 0);
}

// User profile validation
export function validateUserProfile(profile: any): string[] {
  const errors: string[] = [];
  
  if (!profile.firstName || typeof profile.firstName !== 'string') {
    errors.push('First name is required');
  }
  
  if (!profile.lastName || typeof profile.lastName !== 'string') {
    errors.push('Last name is required');
  }
  
  if (!profile.preferredLanguage || !isValidLanguageCode(profile.preferredLanguage)) {
    errors.push('Valid preferred language is required');
  }
  
  if (!profile.location || typeof profile.location !== 'object') {
    errors.push('Location information is required');
  } else {
    if (!profile.location.country || typeof profile.location.country !== 'string') {
      errors.push('Country is required in location');
    }
  }
  
  return errors;
}

// Legal query validation
export function validateLegalQuery(query: any): string[] {
  const errors: string[] = [];
  
  if (!query.description || typeof query.description !== 'string' || query.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  if (!query.category || !isValidLegalCategory(query.category)) {
    errors.push('Valid legal category is required');
  }
  
  if (!query.jurisdiction || !isValidJurisdiction(query.jurisdiction)) {
    errors.push('At least one valid jurisdiction is required');
  }
  
  if (!query.urgency || !isValidUrgency(query.urgency)) {
    errors.push('Valid urgency level is required');
  }
  
  if (query.language && !isValidLanguageCode(query.language)) {
    errors.push('Valid language code is required');
  }
  
  return errors;
}

// Lawyer profile validation
export function validateLawyerProfile(profile: any): string[] {
  const errors: string[] = [];
  
  if (!profile.name || typeof profile.name !== 'string') {
    errors.push('Lawyer name is required');
  }
  
  if (!profile.barNumber || typeof profile.barNumber !== 'string') {
    errors.push('Bar number is required');
  }
  
  if (!profile.jurisdiction || !isValidJurisdiction(profile.jurisdiction)) {
    errors.push('At least one valid jurisdiction is required');
  }
  
  if (!profile.experience || typeof profile.experience !== 'number' || profile.experience < 0) {
    errors.push('Valid years of experience is required');
  }
  
  if (!profile.languages || !Array.isArray(profile.languages) || profile.languages.length === 0) {
    errors.push('At least one language is required');
  } else {
    const invalidLanguages = profile.languages.filter((lang: string) => !isValidLanguageCode(lang));
    if (invalidLanguages.length > 0) {
      errors.push(`Invalid language codes: ${invalidLanguages.join(', ')}`);
    }
  }
  
  return errors;
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim();
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Generic request validation function
export function validateRequest(data: any, schema: any): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  function validateField(value: any, fieldSchema: any, fieldPath: string): void {
    if (fieldSchema.required && (value === undefined || value === null)) {
      errors.push(`${fieldPath} is required`);
      return;
    }
    
    if (value === undefined || value === null) {
      return; // Skip validation for optional fields that are not provided
    }
    
    if (fieldSchema.type) {
      switch (fieldSchema.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${fieldPath} must be a string`);
          } else {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
              errors.push(`${fieldPath} must be at least ${fieldSchema.minLength} characters long`);
            }
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
              errors.push(`${fieldPath} must be at most ${fieldSchema.maxLength} characters long`);
            }
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${fieldPath} must be a number`);
          } else {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
              errors.push(`${fieldPath} must be at least ${fieldSchema.min}`);
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
              errors.push(`${fieldPath} must be at most ${fieldSchema.max}`);
            }
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${fieldPath} must be a boolean`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${fieldPath} must be an array`);
          } else {
            if (fieldSchema.minItems && value.length < fieldSchema.minItems) {
              errors.push(`${fieldPath} must have at least ${fieldSchema.minItems} items`);
            }
            if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
              errors.push(`${fieldPath} must have at most ${fieldSchema.maxItems} items`);
            }
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`${fieldPath} must be an object`);
          }
          break;
      }
    }
  }
  
  function validateObject(obj: any, objSchema: any, basePath: string = ''): void {
    for (const [key, fieldSchema] of Object.entries(objSchema)) {
      const fieldPath = basePath ? `${basePath}.${key}` : key;
      const value = obj?.[key];
      
      if (typeof fieldSchema === 'object' && fieldSchema !== null && !Array.isArray(fieldSchema)) {
        if ('type' in fieldSchema) {
          validateField(value, fieldSchema, fieldPath);
        } else {
          // Nested object schema
          if (value !== undefined && value !== null) {
            validateObject(value, fieldSchema, fieldPath);
          }
        }
      }
    }
  }
  
  validateObject(data, schema);
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}