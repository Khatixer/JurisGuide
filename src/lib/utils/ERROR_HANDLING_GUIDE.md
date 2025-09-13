# Error Handling and User Feedback System

This document describes the comprehensive error handling and user feedback system implemented in the JurisGuide platform.

## Overview

The error handling system provides:
- **Error Boundaries** for React component error catching
- **Retry mechanisms** with exponential backoff
- **User-friendly error messages** with technical error mapping
- **Toast notifications** for success and error feedback
- **Form validation** with real-time feedback
- **Loading states** for better user experience
- **Global error handling** for unhandled errors

## Components

### 1. Error Boundary (`src/components/error-boundary.tsx`)

Catches JavaScript errors in React component trees and displays fallback UI.

```tsx
import { ErrorBoundary } from '@/components/error-boundary'

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

**Features:**
- Automatic error catching and logging
- User-friendly error display
- Retry functionality
- Development mode technical details
- Different error types handling (network, auth, etc.)

### 2. Loading Components (`src/components/ui/loading.tsx`)

Provides consistent loading states across the application.

```tsx
import { LoadingSpinner, LoadingState, PageLoading, InlineLoading } from '@/components/ui/loading'

// Different loading components for different use cases
<LoadingSpinner size="sm" />
<LoadingState message="Processing..." />
<PageLoading message="Loading application..." />
<InlineLoading message="Saving..." />
```

### 3. Error Handling Utilities (`src/lib/utils/error-handling.ts`)

Core error handling functionality with retry mechanisms and user-friendly messaging.

#### Error Classes

```tsx
import { NetworkError, ValidationError, AuthenticationError, ServerError } from '@/lib/utils/error-handling'

// Specific error types for better handling
throw new NetworkError('Connection failed', 404)
throw new ValidationError('Invalid email', 'email')
throw new AuthenticationError('Login required')
throw new ServerError('Internal server error')
```

#### Retry Mechanism

```tsx
import { withRetry } from '@/lib/utils/error-handling'

const result = await withRetry(
  () => fetch('/api/data'),
  { 
    maxAttempts: 3, 
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  },
  (attempt, error) => console.log(`Attempt ${attempt} failed:`, error)
)
```

#### API Request Wrapper

```tsx
import { apiRequest } from '@/lib/utils/error-handling'

const data = await apiRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(payload)
})
```

#### Toast Notifications

```tsx
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handling'

// Success notification
showSuccessToast('Case created successfully', 'Success')

// Error notification
showErrorToast(error, 'Failed to create case')
```

### 4. Form Validation (`src/lib/utils/form-validation.ts`)

Enhanced form validation with real-time feedback.

```tsx
import { validateForm, validateField, validateEmailList } from '@/lib/utils/form-validation'

// Form validation
const { isValid, errors } = validateForm(formData, schema)

// Field validation
const { isValid, error } = validateField(value, fieldSchema)

// Email list validation
const { isValid, validEmails, invalidEmails } = validateEmailList(emailString)
```

#### Real-time Validation Hook

```tsx
import { useFieldValidation } from '@/lib/utils/form-validation'

function MyForm() {
  const [email, setEmail] = useState('')
  const { error, isValidating } = useFieldValidation(emailSchema, email)
  
  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {isValidating && <span>Validating...</span>}
      {error && <span className="error">{error}</span>}
    </div>
  )
}
```

### 5. Enhanced Auth Validation (`src/lib/validations/auth.ts`)

Comprehensive validation schemas for authentication forms.

```tsx
import { signUpSchema, signInSchema } from '@/lib/validations/auth'

// Enhanced password validation with strength requirements
// Enhanced email validation with length limits
// Enhanced name validation with character restrictions
```

## Implementation Examples

### 1. API Route Error Handling

```tsx
// In API routes (e.g., src/app/api/guidance/route.ts)
export async function POST(request: NextRequest) {
  try {
    // Validate request
    if (!question || question.length > 2000) {
      return NextResponse.json({
        success: false,
        error: 'Question is too long (maximum 2000 characters)'
      }, { status: 400 })
    }

    // Process request with retry
    const result = await withRetry(() => processRequest(question))
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: getUserFriendlyErrorMessage(error)
    }, { status: 500 })
  }
}
```

### 2. Component Error Handling

```tsx
// In components (e.g., src/components/guidance/guidance-chat.tsx)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  // Validate input
  if (input.length < 10) {
    setError('Please provide a more detailed question')
    return
  }

  setIsLoading(true)

  try {
    const result = await apiRequest('/api/guidance', {
      method: 'POST',
      body: JSON.stringify({ question: input })
    })
    
    showSuccessToast('Legal guidance provided successfully')
    // Handle success
  } catch (error) {
    const friendlyError = getUserFriendlyErrorMessage(error)
    setError(friendlyError)
    showErrorToast(error, 'Failed to get legal guidance')
  } finally {
    setIsLoading(false)
  }
}
```

### 3. Form Validation

```tsx
// In forms (e.g., src/components/dashboard/create-case-modal.tsx)
const validateForm = (): boolean => {
  const errors: Record<string, string> = {}

  const titleValidation = validateField(formData.title, caseTitle)
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error
  }

  const emailValidation = validateEmailList(formData.participantEmails)
  if (!emailValidation.isValid) {
    errors.participantEmails = emailValidation.error
  }

  setFieldErrors(errors)
  return Object.keys(errors).length === 0
}
```

## Error Types and Handling

### Network Errors
- **Automatic retry** with exponential backoff
- **User-friendly messages** about connectivity issues
- **Fallback content** when services are unavailable

### Validation Errors
- **Real-time validation** as user types
- **Clear error messages** with specific guidance
- **Visual indicators** (red borders, error icons)

### Authentication Errors
- **Automatic redirect** to login page
- **Session refresh** attempts
- **Clear messaging** about authentication requirements

### Server Errors
- **Retry mechanisms** for temporary failures
- **Fallback responses** for AI services
- **Error reporting** for debugging

## Best Practices

### 1. Error Messaging
- Use **user-friendly language** instead of technical jargon
- Provide **actionable guidance** when possible
- Include **retry options** for recoverable errors

### 2. Loading States
- Show **immediate feedback** when actions are initiated
- Use **appropriate loading indicators** for different contexts
- **Disable form submission** during processing

### 3. Validation
- Implement **real-time validation** for better UX
- Show **positive feedback** for valid inputs
- Provide **clear guidance** for fixing errors

### 4. Retry Logic
- **Don't retry** validation or authentication errors
- Use **exponential backoff** to avoid overwhelming servers
- **Limit retry attempts** to prevent infinite loops

### 5. Error Boundaries
- Place **error boundaries** at appropriate component levels
- Provide **meaningful fallback UI**
- Include **recovery options** when possible

## Testing Error Handling

The error handling system includes comprehensive tests:

```bash
# Run error handling tests
npm test src/lib/utils/__tests__/error-handling.test.ts
```

Test coverage includes:
- Error class instantiation
- Message formatting
- Retry mechanisms
- User-friendly error mapping

## Monitoring and Debugging

### Development Mode
- **Detailed error information** in console
- **Stack traces** in error boundaries
- **Network request logging** with retry attempts

### Production Mode
- **User-friendly error messages** only
- **Error reporting** to monitoring services
- **Graceful degradation** for failed services

## Configuration

### Global Error Handling Setup
The global error handler is automatically initialized in the root layout:

```tsx
// src/app/layout.tsx
import { GlobalErrorHandler } from '@/components/global-error-handler'
import { ErrorBoundary } from '@/components/error-boundary'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GlobalErrorHandler />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
```

### Toast Configuration
Toast notifications are configured with appropriate timeouts:

```tsx
// src/hooks/use-toast.ts
const TOAST_REMOVE_DELAY = 5000 // 5 seconds
```

This comprehensive error handling system ensures a robust and user-friendly experience across the entire JurisGuide platform.