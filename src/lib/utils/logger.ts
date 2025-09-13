type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  requestId?: string
  userId?: string
}

class Logger {
  private logLevel: LogLevel
  private isProduction: boolean

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    return levels[level] >= levels[this.logLevel]
  }

  private formatLog(entry: LogEntry): string {
    if (this.isProduction) {
      // Structured JSON logging for production
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level.toUpperCase(),
        message: entry.message,
        context: entry.context,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined,
        requestId: entry.requestId,
        userId: entry.userId
      })
    } else {
      // Human-readable logging for development
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
      const errorStr = entry.error ? `\n${entry.error.stack}` : ''
      return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      requestId: context?.requestId,
      userId: context?.userId
    }

    const formattedLog = this.formatLog(entry)

    // Output to appropriate stream
    if (level === 'error') {
      console.error(formattedLog)
    } else if (level === 'warn') {
      console.warn(formattedLog)
    } else {
      console.log(formattedLog)
    }

    // In production, you might want to send logs to external services
    if (this.isProduction && level === 'error') {
      this.sendToErrorTracking(entry)
    }
  }

  private async sendToErrorTracking(entry: LogEntry) {
    // Send to Sentry or other error tracking service
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && entry.error) {
      try {
        // This would integrate with Sentry SDK
        // Sentry.captureException(entry.error, {
        //   contexts: {
        //     log: entry.context
        //   }
        // })
      } catch (error) {
        console.error('Failed to send error to tracking service:', error)
      }
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
  }

  // API-specific logging methods
  apiRequest(method: string, path: string, context?: Record<string, any>) {
    this.info(`API ${method} ${path}`, {
      type: 'api_request',
      method,
      path,
      ...context
    })
  }

  apiResponse(method: string, path: string, status: number, duration: number, context?: Record<string, any>) {
    this.info(`API ${method} ${path} - ${status} (${duration}ms)`, {
      type: 'api_response',
      method,
      path,
      status,
      duration,
      ...context
    })
  }

  apiError(method: string, path: string, error: Error, context?: Record<string, any>) {
    this.error(`API ${method} ${path} - Error: ${error.message}`, error, {
      type: 'api_error',
      method,
      path,
      ...context
    })
  }

  // AI-specific logging
  aiRequest(endpoint: string, context?: Record<string, any>) {
    this.info(`AI request to ${endpoint}`, {
      type: 'ai_request',
      endpoint,
      ...context
    })
  }

  aiResponse(endpoint: string, duration: number, context?: Record<string, any>) {
    this.info(`AI response from ${endpoint} (${duration}ms)`, {
      type: 'ai_response',
      endpoint,
      duration,
      ...context
    })
  }

  aiError(endpoint: string, error: Error, context?: Record<string, any>) {
    this.error(`AI error from ${endpoint}: ${error.message}`, error, {
      type: 'ai_error',
      endpoint,
      ...context
    })
  }

  // Authentication logging
  authSuccess(userId: string, method: string, context?: Record<string, any>) {
    this.info(`Authentication successful`, {
      type: 'auth_success',
      userId,
      method,
      ...context
    })
  }

  authFailure(reason: string, context?: Record<string, any>) {
    this.warn(`Authentication failed: ${reason}`, {
      type: 'auth_failure',
      reason,
      ...context
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types for use in other modules
export type { LogLevel, LogEntry }