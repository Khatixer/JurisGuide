// Type guards and validation utilities for runtime type checking

import type { 
  UserRole, 
  CaseStatus, 
  MessageSenderType,
  GuidanceChatMessage,
  MediationChatMessage,
  AuthUser,
  UserProfile,
  Case,
  Message
} from '@/types'

// Database enum type guards
export const isValidUserRole = (role: unknown): role is UserRole => {
  return typeof role === 'string' && ['user', 'lawyer', 'admin'].includes(role)
}

export const isValidCaseStatus = (status: unknown): status is CaseStatus => {
  return typeof status === 'string' && ['pending', 'active', 'resolved', 'cancelled'].includes(status)
}

export const isValidMessageSenderType = (type: unknown): type is MessageSenderType => {
  return typeof type === 'string' && ['user', 'ai_mediator'].includes(type)
}

// Object type guards
export const isAuthUser = (user: unknown): user is AuthUser => {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    typeof (user as any).id === 'string' &&
    typeof (user as any).email === 'string'
  )
}

export const isUserProfile = (profile: unknown): profile is UserProfile => {
  return (
    typeof profile === 'object' &&
    profile !== null &&
    'id' in profile &&
    'email' in profile &&
    'full_name' in profile &&
    'role' in profile &&
    typeof (profile as any).id === 'string' &&
    typeof (profile as any).email === 'string' &&
    isValidUserRole((profile as any).role)
  )
}

export const isCase = (caseData: unknown): caseData is Case => {
  return (
    typeof caseData === 'object' &&
    caseData !== null &&
    'id' in caseData &&
    'title' in caseData &&
    'description' in caseData &&
    'status' in caseData &&
    'created_by' in caseData &&
    typeof (caseData as any).id === 'string' &&
    typeof (caseData as any).title === 'string' &&
    typeof (caseData as any).description === 'string' &&
    isValidCaseStatus((caseData as any).status) &&
    typeof (caseData as any).created_by === 'string'
  )
}

export const isMessage = (message: unknown): message is Message => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    'case_id' in message &&
    'content' in message &&
    'sender_type' in message &&
    typeof (message as any).id === 'string' &&
    typeof (message as any).case_id === 'string' &&
    typeof (message as any).content === 'string' &&
    isValidMessageSenderType((message as any).sender_type)
  )
}

export const isGuidanceChatMessage = (message: unknown): message is GuidanceChatMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    'type' in message &&
    'content' in message &&
    'timestamp' in message &&
    typeof (message as any).id === 'string' &&
    ['user', 'ai'].includes((message as any).type) &&
    typeof (message as any).content === 'string' &&
    (message as any).timestamp instanceof Date
  )
}

export const isMediationChatMessage = (message: unknown): message is MediationChatMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'sender_type' in message &&
    'content' in message &&
    'sender_name' in message &&
    isValidMessageSenderType((message as any).sender_type) &&
    typeof (message as any).content === 'string' &&
    typeof (message as any).sender_name === 'string' &&
    (message as any).content.trim().length > 0 &&
    (message as any).sender_name.trim().length > 0
  )
}

// Array type guards
export const isArrayOf = <T>(
  array: unknown,
  typeGuard: (item: unknown) => item is T
): array is T[] => {
  return Array.isArray(array) && array.every(typeGuard)
}

export const isGuidanceChatMessageArray = (messages: unknown): messages is GuidanceChatMessage[] => {
  return isArrayOf(messages, isGuidanceChatMessage)
}

export const isMediationChatMessageArray = (messages: unknown): messages is MediationChatMessage[] => {
  return isArrayOf(messages, isMediationChatMessage)
}

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateCaseTitle = (title: string): { isValid: boolean; error?: string } => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Case title is required' }
  }
  
  if (title.trim().length < 3) {
    return { isValid: false, error: 'Case title must be at least 3 characters long' }
  }
  
  if (title.trim().length > 100) {
    return { isValid: false, error: 'Case title must be less than 100 characters' }
  }
  
  return { isValid: true }
}

export const validateCaseDescription = (description: string): { isValid: boolean; error?: string } => {
  if (!description || description.trim().length === 0) {
    return { isValid: false, error: 'Case description is required' }
  }
  
  if (description.trim().length < 10) {
    return { isValid: false, error: 'Case description must be at least 10 characters long' }
  }
  
  if (description.trim().length > 1000) {
    return { isValid: false, error: 'Case description must be less than 1000 characters' }
  }
  
  return { isValid: true }
}

export const validateMessageContent = (content: string): { isValid: boolean; error?: string } => {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'Message content is required' }
  }
  
  if (content.trim().length > 2000) {
    return { isValid: false, error: 'Message must be less than 2000 characters' }
  }
  
  return { isValid: true }
}

export const validateGuidanceQuestion = (question: string): { isValid: boolean; error?: string } => {
  if (!question || question.trim().length === 0) {
    return { isValid: false, error: 'Question is required' }
  }
  
  if (question.trim().length < 5) {
    return { isValid: false, error: 'Question must be at least 5 characters long' }
  }
  
  if (question.trim().length > 2000) {
    return { isValid: false, error: 'Question must be less than 2000 characters' }
  }
  
  return { isValid: true }
}

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ')
}

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase()
}

export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

// Environment validation
export const validateEnvironmentVariables = (): { isValid: boolean; missing: string[] } => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_GEMINI_API_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  return {
    isValid: missing.length === 0,
    missing
  }
}

// API response validation
export const isApiError = (response: unknown): response is { success: false; error: string } => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'error' in response &&
    (response as any).success === false &&
    typeof (response as any).error === 'string'
  )
}

export const isApiSuccess = <T>(response: unknown): response is { success: true; data: T } => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'data' in response &&
    (response as any).success === true
  )
}

// File validation
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Date validation
export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !isNaN(date.getTime())
}

export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end
}

// Utility type for validation results
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface FieldValidationResult {
  isValid: boolean
  error?: string
}

// Generic validation function
export const validateFields = <T extends Record<string, any>>(
  data: T,
  validators: Record<keyof T, (value: any) => FieldValidationResult>
): ValidationResult => {
  const errors: string[] = []
  
  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(data[field])
    if (!result.isValid && result.error) {
      errors.push(`${field}: ${result.error}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}