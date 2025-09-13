'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandling } from '@/lib/utils/error-handling'

export function GlobalErrorHandler() {
  useEffect(() => {
    setupGlobalErrorHandling()
  }, [])

  return null
}