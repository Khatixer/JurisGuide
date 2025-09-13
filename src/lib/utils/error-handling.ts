import { toast } from '@/hooks/use-toast'

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: string
}

export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ServerError extends Error {
  constructor(message: string = 'Server error occurred') {
    super(message)
    this.name = 'ServerError'
  }
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}

// Exponential backoff delay calculation
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
  return Math.min(delay, config.maxDelay)
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry wrapper for async functions
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain types of errors
      if (error instanceof AuthenticationError || 
          error instanceof ValidationError ||
          (error instanceof NetworkError && error.status && error.status < 500)) {
        throw error
      }

      if (attempt === retryConfig.maxAttempts) {
        break
      }

      const delay = calculateDelay(attempt, retryConfig)
      onRetry?.(attempt, lastError)
      
      await sleep(delay)
    }
  }

  throw lastError!
}

// Enhanced fetch wrapper with error handling and retry
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const fetchWithRetry = () => withRetry(
    async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        switch (response.status) {
          case 401:
            throw new AuthenticationError(errorData.error || 'Authentication required')
          case 400:
            throw new ValidationError(errorData.error || 'Invalid request')
          case 404:
            throw new NetworkError('Resource not found', 404)
          case 429:
            throw new NetworkError('Too many requests', 429)
          case 500:
          case 502:
          case 503:
          case 504:
            throw new ServerError(errorData.error || 'Server error occurred')
          default:
            throw new NetworkError(errorData.error || `Request failed with status ${response.status}`, response.status)
        }
      }

      const data = await response.json()
      
      if (!data.success && data.error) {
        throw new Error(data.error)
      }

      return data.data || data
    },
    retryConfig,
    (attempt, error) => {
      console.warn(`API request attempt ${attempt} failed:`, error.message)
    }
  )

  return fetchWithRetry()
}

// Error message formatting
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

// User-friendly error messages
export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error)
  
  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'fetch': 'Unable to connect to the server. Please check your internet connection.',
    'network': 'Network error occurred. Please try again.',
    'timeout': 'Request timed out. Please try again.',
    'cors': 'Connection error. Please refresh the page and try again.',
    'json': 'Invalid response from server. Please try again.',
    'auth': 'Authentication failed. Please sign in again.',
    'unauthorized': 'You are not authorized to perform this action.',
    'forbidden': 'Access denied. You do not have permission for this action.',
    'not found': 'The requested resource was not found.',
    'too many requests': 'Too many requests. Please wait a moment and try again.',
    'server error': 'Server error occurred. Please try again later.',
    'service unavailable': 'Service is temporarily unavailable. Please try again later.'
  }

  const lowerMessage = message.toLowerCase()
  
  for (const [key, friendlyMessage] of Object.entries(errorMappings)) {
    if (lowerMessage.includes(key)) {
      return friendlyMessage
    }
  }

  return message
}

// Toast error handler
export function showErrorToast(error: unknown, title?: string) {
  const message = getUserFriendlyErrorMessage(error)
  
  toast({
    variant: 'destructive',
    title: title || 'Error',
    description: message,
  })
}

// Toast success handler
export function showSuccessToast(message: string, title?: string) {
  toast({
    variant: 'success' as any,
    title: title || 'Success',
    description: message,
  })
}

// Form error handler
export function handleFormError(error: unknown, setError: (error: string) => void) {
  const message = getUserFriendlyErrorMessage(error)
  setError(message)
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      showErrorToast(event.reason, 'Unexpected Error')
      event.preventDefault()
    })

    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      showErrorToast(event.error, 'Application Error')
    })
  }
}