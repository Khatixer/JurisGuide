import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // Simple session update only for now
    const response = await updateSession(request)
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://jurisguide.com',
    'https://www.jurisguide.com',
    'https://staging.jurisguide.com',
  ]

  if (origin && allowedOrigins.includes(origin)) {
    return origin
  }

  // Default to the first allowed origin in production
  return process.env.NODE_ENV === 'production' 
    ? 'https://jurisguide.com' 
    : 'http://localhost:3000'
}

function getSecurityHeaders(request: NextRequest): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Control referrer information
    'Referrer-Policy': 'origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // Content Security Policy
    'Content-Security-Policy': isProduction 
      ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com ws://localhost:*; frame-ancestors 'none';",
    
    // Strict Transport Security (HTTPS only in production)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Remove server information
    'Server': '',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}