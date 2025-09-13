import React from 'react'
import { z } from 'zod'

// Enhanced validation schemas with better error messages
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email address is too long')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

export const caseTitle = z
  .string()
  .min(5, 'Case title must be at least 5 characters long')
  .max(200, 'Case title is too long')
  .trim()

export const caseDescription = z
  .string()
  .min(20, 'Case description must be at least 20 characters long')
  .max(2000, 'Case description is too long')
  .trim()

export const participantEmailsSchema = z
  .string()
  .min(1, 'At least one participant email is required')
  .transform((str) => str.split(',').map(email => email.trim()).filter(Boolean))
  .pipe(z.array(emailSchema).min(1, 'At least one valid email is required'))

// Real-time validation hook
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  value: string,
  debounceMs: number = 300
) {
  const [error, setError] = React.useState<string>('')
  const [isValidating, setIsValidating] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!value) {
      setError('')
      setIsValidating(false)
      return
    }

    setIsValidating(true)

    timeoutRef.current = setTimeout(() => {
      try {
        schema.parse(value)
        setError('')
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.issues[0]?.message || 'Invalid input')
        }
      } finally {
        setIsValidating(false)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, schema, debounceMs])

  return { error, isValidating }
}

// Form validation utilities
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateForm<T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>
): ValidationResult {
  try {
    schema.parse(data)
    return { isValid: true, errors: {} }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue) => {
        const path = issue.path.join('.')
        if (!errors[path]) {
          errors[path] = issue.message
        }
      })
      return { isValid: false, errors }
    }
    return { isValid: false, errors: { general: 'Validation failed' } }
  }
}

// Field-level validation
export function validateField<T>(
  value: T,
  schema: z.ZodSchema<T>
): { isValid: boolean; error?: string } {
  try {
    schema.parse(value)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

// Email validation with additional checks
export function validateEmailList(emails: string): {
  isValid: boolean
  validEmails: string[]
  invalidEmails: string[]
  error?: string
} {
  if (!emails.trim()) {
    return {
      isValid: false,
      validEmails: [],
      invalidEmails: [],
      error: 'At least one email is required'
    }
  }

  const emailList = emails
    .split(',')
    .map(email => email.trim())
    .filter(Boolean)

  if (emailList.length === 0) {
    return {
      isValid: false,
      validEmails: [],
      invalidEmails: [],
      error: 'At least one email is required'
    }
  }

  const validEmails: string[] = []
  const invalidEmails: string[] = []

  emailList.forEach(email => {
    const result = validateField(email, emailSchema)
    if (result.isValid) {
      validEmails.push(email)
    } else {
      invalidEmails.push(email)
    }
  })

  if (invalidEmails.length > 0) {
    return {
      isValid: false,
      validEmails,
      invalidEmails,
      error: `Invalid email addresses: ${invalidEmails.join(', ')}`
    }
  }

  if (validEmails.length === 0) {
    return {
      isValid: false,
      validEmails,
      invalidEmails,
      error: 'At least one valid email is required'
    }
  }

  return {
    isValid: true,
    validEmails,
    invalidEmails
  }
}

// Password strength indicator
export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (password.length >= 12) score += 1
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Add uppercase letters')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Add lowercase letters')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Add numbers')

  if (/[^A-Za-z0-9]/.test(password)) score += 1
  else feedback.push('Add special characters (!@#$%^&*)')

  const isStrong = score >= 4 && password.length >= 8

  return { score, feedback, isStrong }
}