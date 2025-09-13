interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  metadata?: any;
}

class Logger {
  private createLogEntry(
    level: string, 
    message: string, 
    requestId?: string, 
    userId?: string, 
    metadata?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId,
      userId,
      metadata
    };
  }

  private log(entry: LogEntry): void {
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case LOG_LEVELS.ERROR:
        console.error(logString);
        break;
      case LOG_LEVELS.WARN:
        console.warn(logString);
        break;
      case LOG_LEVELS.INFO:
        console.info(logString);
        break;
      case LOG_LEVELS.DEBUG:
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }

  error(message: string, requestId?: string, userId?: string, metadata?: any): void {
    this.log(this.createLogEntry(LOG_LEVELS.ERROR, message, requestId, userId, metadata));
  }

  warn(message: string, requestId?: string, userId?: string, metadata?: any): void {
    this.log(this.createLogEntry(LOG_LEVELS.WARN, message, requestId, userId, metadata));
  }

  info(message: string, requestId?: string, userId?: string, metadata?: any): void {
    this.log(this.createLogEntry(LOG_LEVELS.INFO, message, requestId, userId, metadata));
  }

  debug(message: string, requestId?: string, userId?: string, metadata?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(this.createLogEntry(LOG_LEVELS.DEBUG, message, requestId, userId, metadata));
    }
  }

  // Specific logging methods for common scenarios
  apiRequest(method: string, path: string, requestId: string, userId?: string): void {
    this.info(`API Request: ${method} ${path}`, requestId, userId);
  }

  apiResponse(method: string, path: string, statusCode: number, requestId: string, userId?: string): void {
    this.info(`API Response: ${method} ${path} - ${statusCode}`, requestId, userId);
  }

  databaseQuery(query: string, requestId?: string, userId?: string): void {
    this.debug(`Database Query: ${query}`, requestId, userId);
  }

  authAttempt(email: string, success: boolean, requestId?: string): void {
    const message = `Authentication attempt for ${email}: ${success ? 'SUCCESS' : 'FAILED'}`;
    if (success) {
      this.info(message, requestId);
    } else {
      this.warn(message, requestId);
    }
  }

  securityEvent(event: string, details: any, requestId?: string, userId?: string): void {
    this.warn(`Security Event: ${event}`, requestId, userId, details);
  }
}

export const logger = new Logger();
export { LOG_LEVELS };