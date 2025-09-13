// API-specific types for request/response handling and Google Gemini integration

import type { MessageSenderType } from './database'

// Base API response structure
export interface BaseApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

// Error response structure
export interface ApiErrorResponse {
  success: false
  error: string
  details?: any
  code?: string
  timestamp: string
}

// Success response structure
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

// Generic API response type
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// Request validation types
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Guidance API Types
export interface GuidanceApiRequest {
  question: string
  stream?: boolean
  context?: {
    userRole?: string
    jurisdiction?: string
    previousQuestions?: string[]
  }
}

export interface GuidanceApiResponse {
  response: string
  timestamp: string
  metadata?: {
    model: string
    tokensUsed?: number
    processingTime?: number
  }
}

export interface GuidanceStreamChunk {
  chunk: string
  isComplete?: boolean
}

export interface GuidanceStreamResponse {
  stream: ReadableStream<Uint8Array>
  headers: Record<string, string>
}

// Mediation API Types
export interface MediationChatMessage {
  sender_type: MessageSenderType
  content: string
  sender_name: string
  timestamp?: string
}

export interface MediationApiRequest {
  caseId: string
  chatHistory: MediationChatMessage[]
  context?: {
    caseTitle?: string
    caseDescription?: string
    participantCount?: number
  }
}

export interface MediationApiResponse {
  response: string
  caseId: string
  timestamp: string
  metadata?: {
    model: string
    tokensUsed?: number
    processingTime?: number
    contextLength?: number
  }
}

// Google Gemini API Integration Types
export interface GeminiApiConfig {
  apiKey: string
  model: string
  generationConfig?: GeminiGenerationConfig
}

export interface GeminiGenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  stopSequences?: string[]
  candidateCount?: number
}

export interface GeminiSafetySettings {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE'
}

export interface GeminiContent {
  parts: Array<{
    text?: string
    inlineData?: {
      mimeType: string
      data: string
    }
  }>
  role?: 'user' | 'model'
}

export interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: GeminiGenerationConfig
  safetySettings?: GeminiSafetySettings[]
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
}

export interface GeminiCandidate {
  content: GeminiContent
  finishReason?: 'FINISH_REASON_UNSPECIFIED' | 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER'
  safetyRatings?: Array<{
    category: string
    probability: string
  }>
  citationMetadata?: {
    citationSources: Array<{
      startIndex?: number
      endIndex?: number
      uri?: string
      license?: string
    }>
  }
}

export interface GeminiResponse {
  candidates: GeminiCandidate[]
  promptFeedback?: {
    safetyRatings: Array<{
      category: string
      probability: string
    }>
    blockReason?: string
  }
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export interface GeminiStreamResponse {
  candidates: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export interface GeminiError {
  error: {
    code: number
    message: string
    status: string
    details?: Array<{
      '@type': string
      reason?: string
      domain?: string
      metadata?: Record<string, any>
    }>
  }
}

// Authentication API Types
export interface AuthApiRequest {
  email: string
  password: string
  fullName?: string
  country?: string
  role?: string
}

export interface AuthApiResponse {
  user: {
    id: string
    email: string
    user_metadata?: Record<string, any>
  }
  session: {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

// Case Management API Types
export interface CreateCaseApiRequest {
  title: string
  description: string
  participantEmails: string[]
}

export interface CreateCaseApiResponse {
  case: {
    id: string
    title: string
    description: string
    status: string
    created_by: string
    created_at: string
  }
  participants: Array<{
    id: string
    email: string
    invited: boolean
  }>
}

export interface UpdateCaseApiRequest {
  title?: string
  description?: string
  status?: string
}

export interface JoinCaseApiRequest {
  caseId: string
  invitationToken?: string
}

// Message API Types
export interface SendMessageApiRequest {
  caseId: string
  content: string
  senderType?: MessageSenderType
}

export interface SendMessageApiResponse {
  message: {
    id: string
    case_id: string
    sender_id: string | null
    sender_type: MessageSenderType
    content: string
    created_at: string
  }
}

// File Upload API Types
export interface FileUploadApiRequest {
  file: File
  caseId?: string
  category?: 'evidence' | 'document' | 'image'
}

export interface FileUploadApiResponse {
  file: {
    id: string
    filename: string
    url: string
    size: number
    mimeType: string
    uploadedAt: string
  }
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

// Webhook Types
export interface WebhookPayload<T = any> {
  event: string
  data: T
  timestamp: string
  signature?: string
}

export interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, any>
  old_record?: Record<string, any>
}

// API Middleware Types
export interface ApiMiddleware {
  (req: Request, res: Response, next: () => void): void | Promise<void>
}

export interface CorsConfig {
  origin: string | string[] | boolean
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  services: {
    database: 'up' | 'down'
    ai: 'up' | 'down'
    storage: 'up' | 'down'
  }
  metrics?: {
    uptime: number
    memoryUsage: number
    cpuUsage: number
  }
}

// Pagination Types
export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}

export interface PaginatedApiResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: Record<string, any>
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

// Cache Types
export interface CacheConfig {
  ttl: number
  maxSize?: number
  strategy?: 'lru' | 'fifo' | 'lfu'
}

export interface CacheEntry<T> {
  key: string
  value: T
  expiresAt: Date
  createdAt: Date
  accessCount: number
}

// Monitoring and Analytics Types
export interface ApiMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
  userId?: string
  userAgent?: string
  ip?: string
}

export interface ErrorLog {
  id: string
  message: string
  stack?: string
  endpoint: string
  method: string
  userId?: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
}

// Type guards for API responses
export const isApiError = (response: any): response is ApiErrorResponse => {
  return response && response.success === false && typeof response.error === 'string'
}

export const isApiSuccess = <T>(response: any): response is ApiSuccessResponse<T> => {
  return response && response.success === true && response.data !== undefined
}

// Utility types for API handlers
export type ApiHandler<TRequest = any, TResponse = any> = (
  request: TRequest
) => Promise<ApiResponse<TResponse>>

export type AuthenticatedApiHandler<TRequest = any, TResponse = any> = (
  request: TRequest,
  userId: string
) => Promise<ApiResponse<TResponse>>

export type ValidatedApiHandler<TRequest = any, TResponse = any> = (
  request: TRequest
) => Promise<ApiResponse<TResponse>>