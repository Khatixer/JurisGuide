import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { performanceMonitor } from './performance'
import { apiRateLimit, authRateLimit, aiRateLimit } from './rate-limit'

export interface ApiContext {
  requestId: string
  startTime: number
  userId?: string
  userAgent?: string
  ip?: string
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
}

// API monitoring wrapper
export function withApiMonitoring(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context: ApiContext = {
      requestId: generateRequestId(),
      startTime: Date.now(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request)
    }

    const method = request.method
    const path = request.nextUrl.pathname

    // Start performance monitoring
    performanceMonitor.startTimer(`api_${method}_${path}`, {
      requestId: context.requestId,
      method,
      path
    })

    // Log incoming request
    logger.apiRequest(method, path, {
      requestId: context.requestId,
      userAgent: context.userAgent,
      ip: context.ip
    })

    try {
      const response = await handler(request, context)
      const duration = Date.now() - context.startTime

      // End performance monitoring
      performanceMonitor.endTimer(`api_${method}_${path}`, {
        requestId: context.requestId,
        status: response.status,
        success: true
      })

      // Log successful response
      logger.apiResponse(method, path, response.status, duration, {
        requestId: context.requestId
      })

      // Add monitoring headers
      response.headers.set('X-Request-ID', context.requestId)
      response.headers.set('X-Response-Time', `${duration}ms`)

      return response
    } catch (error) {
      const duration = Date.now() - context.startTime
      const err = error as Error

      // End performance monitoring with error
      performanceMonitor.endTimer(`api_${method}_${path}`, {
        requestId: context.requestId,
        success: false,
        error: err.message
      })

      // Log error
      logger.apiError(method, path, err, {
        requestId: context.requestId,
        duration
      })

      // Return error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          requestId: context.requestId,
          timestamp: new Date().toISOString()
        },
        { 
          status: 500,
          headers: {
            'X-Request-ID': context.requestId,
            'X-Response-Time': `${duration}ms`
          }
        }
      )
    }
  }
}

// Rate limiting wrapper
export function withRateLimit(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse>,
  type: 'api' | 'auth' | 'ai' = 'api'
) {
  return withApiMonitoring(async (request: NextRequest, context: ApiContext) => {
    // Apply appropriate rate limit
    const rateLimiter = type === 'auth' ? authRateLimit : type === 'ai' ? aiRateLimit : apiRateLimit
    const rateLimitResult = rateLimiter(request)

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', {
        requestId: context.requestId,
        ip: context.ip,
        limit: rateLimitResult.limit,
        retryAfter: rateLimitResult.retryAfter
      })

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      )
    }

    // Add rate limit headers to successful responses
    const response = await handler(request, context)
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())

    return response
  })
}

// Authentication wrapper
export function withAuth(
  handler: (request: NextRequest, context: ApiContext & { userId: string }) => Promise<NextResponse>
) {
  return withApiMonitoring(async (request: NextRequest, context: ApiContext) => {
    // Extract user ID from authorization header or session
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('session')

    // This is a simplified auth check - in real implementation,
    // you would validate JWT tokens or session cookies
    let userId: string | undefined

    if (authHeader?.startsWith('Bearer ')) {
      // Validate JWT token and extract user ID
      // userId = await validateJWT(authHeader.substring(7))
    } else if (sessionCookie) {
      // Validate session cookie and extract user ID
      // userId = await validateSession(sessionCookie.value)
    }

    if (!userId) {
      logger.authFailure('Missing or invalid authentication', {
        requestId: context.requestId,
        ip: context.ip
      })

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      )
    }

    logger.authSuccess(userId, 'api_request', {
      requestId: context.requestId
    })

    return handler(request, { ...context, userId })
  })
}

// Health check endpoint
export function createHealthCheck() {
  return withApiMonitoring(async (request: NextRequest, context: ApiContext) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        supabase: await checkSupabaseHealth(),
        gemini: await checkGeminiHealth()
      }
    }

    return NextResponse.json(health)
  })
}

async function checkSupabaseHealth(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now()
    // Simple health check - you might want to do a lightweight query
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    })
    const latency = Date.now() - start

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      latency
    }
  } catch (error) {
    return { status: 'unhealthy' }
  }
}

async function checkGeminiHealth(): Promise<{ status: string }> {
  try {
    // Simple check to see if API key is configured
    return {
      status: process.env.GOOGLE_GEMINI_API_KEY ? 'configured' : 'not_configured'
    }
  } catch (error) {
    return { status: 'unhealthy' }
  }
}