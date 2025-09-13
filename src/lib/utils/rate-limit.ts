import { NextRequest } from 'next/server'

interface RateLimitConfig {
  requests: number
  window: number // in seconds
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export function rateLimit(config: RateLimitConfig = { requests: 60, window: 60 }) {
  return (request: NextRequest) => {
    const identifier = getIdentifier(request)
    const now = Date.now()
    const windowStart = now - (config.window * 1000)
    
    // Initialize or get existing record
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + (config.window * 1000)
      }
    }
    
    // Increment count
    store[identifier].count++
    
    // Check if limit exceeded
    const isLimited = store[identifier].count > config.requests
    const resetTime = Math.ceil((store[identifier].resetTime - now) / 1000)
    
    return {
      success: !isLimited,
      limit: config.requests,
      remaining: Math.max(0, config.requests - store[identifier].count),
      reset: resetTime,
      retryAfter: isLimited ? resetTime : undefined
    }
  }
}

function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for different deployment environments)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return `${ip}:${userAgent.slice(0, 50)}`
}

// Specific rate limiters for different endpoints
export const apiRateLimit = rateLimit({
  requests: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
  window: 60
})

export const authRateLimit = rateLimit({
  requests: 5, // Stricter for auth endpoints
  window: 60
})

export const aiRateLimit = rateLimit({
  requests: 10, // Even stricter for AI endpoints
  window: 60
})