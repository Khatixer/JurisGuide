import { logger } from './logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: number
  context?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()

  // Start timing an operation
  startTimer(name: string, context?: Record<string, any>): void {
    this.timers.set(name, Date.now())
    logger.debug(`Started timer: ${name}`, context)
  }

  // End timing and record metric
  endTimer(name: string, context?: Record<string, any>): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      logger.warn(`Timer not found: ${name}`)
      return 0
    }

    const duration = Date.now() - startTime
    this.timers.delete(name)

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      context
    })

    logger.debug(`Completed timer: ${name} (${duration}ms)`, context)
    return duration
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Log performance issues
    if (metric.unit === 'ms' && metric.value > 5000) {
      logger.warn(`Slow operation detected: ${metric.name} took ${metric.value}ms`, metric.context)
    }

    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(metric)
    }
  }

  // Get metrics for a specific operation
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name)
    }
    return [...this.metrics]
  }

  // Get average performance for an operation
  getAveragePerformance(name: string, timeWindow?: number): number {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    const relevantMetrics = this.metrics.filter(
      m => m.name === name && m.timestamp > cutoff
    )

    if (relevantMetrics.length === 0) return 0

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / relevantMetrics.length
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = []
    this.timers.clear()
  }

  private async sendToMonitoring(metric: PerformanceMetric): Promise<void> {
    try {
      // This would integrate with monitoring services like DataDog, New Relic, etc.
      // Example for custom monitoring endpoint:
      /*
      await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      })
      */
    } catch (error) {
      logger.error('Failed to send metric to monitoring service', error as Error, {
        metric: metric.name
      })
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Utility function to measure async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTimer(name, context)
  try {
    const result = await operation()
    performanceMonitor.endTimer(name, { ...context, success: true })
    return result
  } catch (error) {
    performanceMonitor.endTimer(name, { ...context, success: false, error: (error as Error).message })
    throw error
  }
}

// Utility function to measure sync operations
export function measureSync<T>(
  name: string,
  operation: () => T,
  context?: Record<string, any>
): T {
  performanceMonitor.startTimer(name, context)
  try {
    const result = operation()
    performanceMonitor.endTimer(name, { ...context, success: true })
    return result
  } catch (error) {
    performanceMonitor.endTimer(name, { ...context, success: false, error: (error as Error).message })
    throw error
  }
}

// React hook for measuring component render performance
export function usePerformanceMonitor(componentName: string) {
  const startTime = Date.now()

  return {
    recordRender: (props?: Record<string, any>) => {
      const renderTime = Date.now() - startTime
      performanceMonitor.recordMetric({
        name: `component_render_${componentName}`,
        value: renderTime,
        unit: 'ms',
        timestamp: Date.now(),
        context: props
      })
    }
  }
}

// Export types
export type { PerformanceMetric }