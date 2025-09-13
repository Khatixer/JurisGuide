// Core application types and interfaces
import type { 
  Database, 
  Tables, 
  TablesInsert, 
  TablesUpdate,
  Profile,
  Case,
  CaseParticipant,
  Message,
  UserRole,
  CaseStatus,
  MessageSenderType
} from './database'

// Re-export database types for convenience
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Profile,
  Case,
  CaseParticipant,
  Message,
  UserRole,
  CaseStatus,
  MessageSenderType
} from './database'

// Enhanced types with relationships
export interface UserProfile extends Profile {
  // Additional computed properties can be added here
}

export interface CaseWithParticipants extends Case {
  case_participants: (CaseParticipant & {
    profiles?: {
      full_name: string | null
      email: string
    } | null
  })[]
}

export interface MessageWithProfile extends Message {
  profiles?: {
    full_name: string | null
    email: string
  } | null
}

// API Request/Response Types

// Guidance API Types
export interface GuidanceRequest {
  question: string
  stream?: boolean
}

export interface GuidanceResponse {
  response: string
  timestamp: string
}

export interface GuidanceStreamChunk {
  chunk: string
}

// Mediation API Types
export interface ChatMessage {
  sender_type: MessageSenderType
  content: string
  sender_name: string
}

export interface MediationRequest {
  caseId: string
  chatHistory: ChatMessage[]
}

export interface MediationResponse {
  response: string
  caseId: string
  timestamp?: string
}

// Authentication Types
export interface SignupFormData {
  fullName: string
  email: string
  password: string
  country: string
  role: UserRole
}

export interface LoginFormData {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    role?: UserRole
    country?: string
  }
}

// Case Management Types
export interface CreateCaseFormData {
  title: string
  description: string
  participantEmails: string[]
}

export interface CaseInvitation {
  caseId: string
  email: string
  invitedBy: string
}

// Component Props Types

// Dashboard Components
export interface CaseListProps {
  cases: CaseWithParticipants[]
}

export interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onCaseCreated: (caseData: Case) => void
}

export interface DashboardContentProps {
  user: UserProfile
  cases: CaseWithParticipants[]
}

// Mediation Components
export interface MessageDisplayProps {
  messages: MessageWithProfile[]
  currentUserId: string
}

export interface MessageInputProps {
  caseId: string
  onMessageSent: (message: Message) => void
  disabled?: boolean
}

export interface MediationRoomProps {
  caseId: string
  initialMessages: MessageWithProfile[]
  currentUser: UserProfile
  caseData: CaseWithParticipants
}

// Guidance Components
export interface GuidanceChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export interface SatisfactionState {
  shown: boolean
  satisfied: boolean | null
}

export interface GuidanceChatProps {
  initialMessages?: GuidanceChatMessage[]
}

// Utility Types

// Form validation types
export type FormErrors<T> = {
  [K in keyof T]?: string
}

export interface FormState<T> {
  data: T
  errors: FormErrors<T>
  isSubmitting: boolean
  isValid: boolean
}

// API response wrapper types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface ApiError {
  error: string
  details?: any
  status: number
}

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Real-time subscription types
export interface RealtimeSubscription {
  channel: string
  event: string
  callback: (payload: any) => void
}

export interface MessageSubscriptionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Message
  old?: Message
}

// Google Gemini API Types
export interface GeminiGenerationConfig {
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  stopSequences?: string[]
}

export interface GeminiModelConfig {
  model: string
  generationConfig?: GeminiGenerationConfig
}

export interface GeminiResponse {
  response: {
    text(): string
  }
}

export interface GeminiStreamResponse {
  stream: AsyncIterable<{
    text(): string
  }>
}

// Environment configuration types
export interface EnvironmentConfig {
  supabase: {
    url: string
    anonKey: string
  }
  googleAI: {
    apiKey: string
  }
  app: {
    url: string
    environment: 'development' | 'staging' | 'production'
  }
}

// Supabase client types
export interface SupabaseClientConfig {
  url: string
  key: string
  options?: {
    auth?: {
      autoRefreshToken?: boolean
      persistSession?: boolean
    }
  }
}

// Route handler types
export interface RouteContext {
  params: Record<string, string>
  searchParams: Record<string, string | string[]>
}

export interface AuthenticatedRouteHandler<T = any> {
  (request: Request, context: RouteContext, user: AuthUser): Promise<Response>
}

// Middleware types
export interface MiddlewareConfig {
  matcher: string[]
  publicRoutes: string[]
  authRoutes: string[]
}

// Error handling types
export interface AppError extends Error {
  code?: string
  statusCode?: number
  details?: any
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

// Toast notification types
export interface ToastMessage {
  id: string
  title?: string
  description: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Theme and styling types
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
  }
  fonts: {
    sans: string[]
    mono: string[]
  }
}

// Analytics and monitoring types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: Date
}

export interface PerformanceMetrics {
  pageLoadTime: number
  apiResponseTime: number
  renderTime: number
  errorRate: number
}

// Re-export API types
export type * from './api'

// Re-export component types
export type * from './components'