'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)} 
      aria-hidden="true"
    />
  )
}

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md', 
  className 
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-gray-600">{message}</span>
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto text-[#0A2540]" />
        <p className="text-lg text-gray-600">{message}</p>
      </div>
    </div>
  )
}

interface InlineLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function InlineLoading({ message = 'Processing...', size = 'sm' }: InlineLoadingProps) {
  return (
    <div className="flex items-center space-x-2 text-gray-600">
      <LoadingSpinner size={size} />
      <span className="text-sm">{message}</span>
    </div>
  )
}