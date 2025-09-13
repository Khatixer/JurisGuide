// Component-specific types for props, state management, and UI interactions

import type { ReactNode, ComponentProps, HTMLAttributes } from 'react'
import type { 
  UserProfile, 
  CaseWithParticipants, 
  MessageWithProfile, 
  GuidanceChatMessage,
  CreateCaseFormData,
  SignupFormData,
  LoginFormData
} from './index'

// Base component props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  id?: string
}

// Layout component props
export interface LayoutProps extends BaseComponentProps {
  title?: string
  description?: string
  showNavigation?: boolean
  showFooter?: boolean
}

export interface NavigationProps {
  user?: UserProfile | null
  currentPath?: string
}

export interface FooterProps {
  showSocialLinks?: boolean
  showLegalLinks?: boolean
}

// Authentication component props
export interface AuthFormProps extends BaseComponentProps {
  onSubmit: (data: SignupFormData | LoginFormData) => Promise<void>
  isLoading?: boolean
  error?: string
  redirectTo?: string
}

export interface SignupFormProps extends BaseComponentProps {
  onSubmit: (data: SignupFormData) => Promise<void>
  isLoading?: boolean
  error?: string
  countries: Array<{ code: string; name: string }>
}

export interface LoginFormProps extends BaseComponentProps {
  onSubmit: (data: LoginFormData) => Promise<void>
  isLoading?: boolean
  error?: string
}

export interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
  allowedRoles?: string[]
}

// Dashboard component props
export interface DashboardLayoutProps extends BaseComponentProps {
  user: UserProfile
  children: ReactNode
}

export interface DashboardSidebarProps {
  user: UserProfile
  currentPath: string
  onNavigate?: (path: string) => void
}

export interface DashboardHeaderProps {
  user: UserProfile
  title?: string
  actions?: ReactNode
}

export interface DashboardContentProps extends BaseComponentProps {
  user: UserProfile
  cases: CaseWithParticipants[]
  onCaseCreated?: (caseData: CaseWithParticipants) => void
  onCaseUpdated?: (caseData: CaseWithParticipants) => void
}

// Case management component props
export interface CaseListProps extends BaseComponentProps {
  cases: CaseWithParticipants[]
  onCaseSelect?: (caseId: string) => void
  onCaseUpdate?: (caseData: CaseWithParticipants) => void
  loading?: boolean
  emptyState?: ReactNode
}

export interface CaseCardProps extends BaseComponentProps {
  case: CaseWithParticipants
  onSelect?: (caseId: string) => void
  onUpdate?: (caseData: CaseWithParticipants) => void
  showActions?: boolean
}

export interface CreateCaseModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  onCaseCreated: (caseData: CaseWithParticipants) => void
  isLoading?: boolean
  error?: string
}

export interface CreateCaseFormProps extends BaseComponentProps {
  onSubmit: (data: CreateCaseFormData) => Promise<void>
  isLoading?: boolean
  error?: string
  initialData?: Partial<CreateCaseFormData>
}

export interface CaseStatusBadgeProps extends BaseComponentProps {
  status: 'pending' | 'active' | 'resolved' | 'cancelled'
  size?: 'sm' | 'md' | 'lg'
}

export interface CaseParticipantsProps extends BaseComponentProps {
  participants: CaseWithParticipants['case_participants']
  maxVisible?: number
  showInviteButton?: boolean
  onInvite?: (email: string) => void
}

// Mediation component props
export interface MediationRoomProps extends BaseComponentProps {
  caseId: string
  initialMessages: MessageWithProfile[]
  currentUser: UserProfile
  caseData: CaseWithParticipants
  onMessageSent?: (message: MessageWithProfile) => void
  onAiMediationRequested?: () => void
}

export interface MessageDisplayProps extends BaseComponentProps {
  messages: MessageWithProfile[]
  currentUserId: string
  loading?: boolean
  emptyState?: ReactNode
  onMessageAction?: (messageId: string, action: string) => void
}

export interface MessageBubbleProps extends BaseComponentProps {
  message: MessageWithProfile
  isCurrentUser: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
  onAction?: (action: string) => void
}

export interface MessageInputProps extends BaseComponentProps {
  caseId: string
  onMessageSent: (message: MessageWithProfile) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  showEmojiPicker?: boolean
  showAttachments?: boolean
}

export interface AiMediatorButtonProps extends BaseComponentProps {
  caseId: string
  chatHistory: MessageWithProfile[]
  onMediationResponse: (response: string) => void
  disabled?: boolean
  loading?: boolean
}

export interface MediationControlsProps extends BaseComponentProps {
  caseId: string
  caseStatus: 'pending' | 'active' | 'resolved' | 'cancelled'
  onStatusChange: (status: string) => void
  onInviteParticipant: (email: string) => void
  onExportChat: () => void
  userRole: string
}

// Guidance component props
export interface GuidanceChatProps extends BaseComponentProps {
  initialMessages?: GuidanceChatMessage[]
  onMessageSent?: (message: GuidanceChatMessage) => void
  onSatisfactionResponse?: (satisfied: boolean) => void
  maxMessages?: number
}

export interface GuidanceInputProps extends BaseComponentProps {
  onSubmit: (question: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  showSuggestions?: boolean
  suggestions?: string[]
}

export interface GuidanceMessageProps extends BaseComponentProps {
  message: GuidanceChatMessage
  showActions?: boolean
  onAction?: (action: string) => void
}

export interface SatisfactionSurveyProps extends BaseComponentProps {
  onResponse: (satisfied: boolean) => void
  onSkip?: () => void
  showSkipOption?: boolean
}

export interface NextStepsProps extends BaseComponentProps {
  satisfied: boolean
  onConsultLawyer: () => void
  onStartMediation: () => void
  showBothOptions?: boolean
}

// UI component props
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

export interface ToastProps extends BaseComponentProps {
  title?: string
  description: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

export interface ConfirmDialogProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export interface AvatarProps extends BaseComponentProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
}

export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export interface InputProps extends ComponentProps<'input'> {
  label?: string
  description?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  label?: string
  description?: string
  error?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export interface SelectProps extends BaseComponentProps {
  label?: string
  description?: string
  error?: string
  placeholder?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

// Form component props
export interface FormFieldProps extends BaseComponentProps {
  name: string
  label?: string
  description?: string
  error?: string
  required?: boolean
}

export interface FormProps extends ComponentProps<'form'> {
  onSubmit: (data: any) => Promise<void> | void
  loading?: boolean
  error?: string
  resetOnSubmit?: boolean
}

// State management types
export interface FormState<T> {
  data: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetch?: Date
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

export interface FilterState {
  search: string
  status: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// Hook return types
export interface UseFormReturn<T> {
  data: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  setValue: (field: keyof T, value: any) => void
  setError: (field: keyof T, error: string) => void
  clearError: (field: keyof T) => void
  reset: (data?: Partial<T>) => void
  submit: () => Promise<void>
}

export interface UseAsyncReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: any[]) => Promise<T>
  reset: () => void
}

export interface UseToastReturn {
  toast: (props: Omit<ToastProps, 'onClose'>) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  dismiss: (id?: string) => void
  dismissAll: () => void
}

// Event handler types
export type ClickHandler = (event: React.MouseEvent) => void
export type ChangeHandler<T = string> = (value: T) => void
export type SubmitHandler<T> = (data: T) => Promise<void> | void
export type KeyboardHandler = (event: React.KeyboardEvent) => void
export type FocusHandler = (event: React.FocusEvent) => void

// Responsive design types
export interface ResponsiveValue<T> {
  base?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
}

export interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
}

// Animation and transition types
export interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
}

export interface TransitionProps {
  show: boolean
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  duration?: number
}

// Accessibility types
export interface A11yProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  role?: string
  tabIndex?: number
}

// Theme and styling types
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
  input: string
  ring: string
  destructive: string
  warning: string
  success: string
  info: string
}

export interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  '4xl': string
}

export interface ThemeTypography {
  fontFamily: {
    sans: string[]
    mono: string[]
  }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  fontWeight: {
    normal: number
    medium: number
    semibold: number
    bold: number
  }
}