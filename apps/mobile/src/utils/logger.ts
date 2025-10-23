/**
 * Logger utility for consistent error logging and debugging
 *
 * Provides a centralized logging system with different log levels
 * and optional reporting to crash analytics services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = __DEV__;

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}`, context || '');
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');

    // In production, you might want to send warnings to a monitoring service
    if (!this.isDevelopment) {
      this.reportToMonitoring('warning', message, context);
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[ERROR] ${message}`, {
      error: errorMessage,
      stack: errorStack,
      ...context
    });

    // Report errors to crash analytics in production
    if (!this.isDevelopment) {
      this.reportToMonitoring('error', message, {
        error: errorMessage,
        stack: errorStack,
        ...context
      });
    }
  }

  /**
   * Log network request failures with retry information
   */
  networkError(
    message: string,
    error: Error | unknown,
    retriesLeft?: number,
    context?: LogContext
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (retriesLeft !== undefined && retriesLeft > 0) {
      this.warn(`${message} - Retrying (${retriesLeft} attempts left)`, {
        error: errorMessage,
        retriesLeft,
        ...context
      });
    } else {
      this.error(`${message} - All retries exhausted`, error, context);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[PERF] ${operation} took ${duration}ms`, context || '');
    }

    // You could send performance metrics to analytics
    if (duration > 3000) { // Log slow operations
      this.warn(`Slow operation: ${operation}`, {
        duration,
        ...context
      });
    }
  }

  /**
   * Report to external monitoring service (placeholder)
   * In production, this would integrate with services like Sentry, Bugsnag, etc.
   */
  private reportToMonitoring(
    level: 'warning' | 'error',
    message: string,
    context?: LogContext
  ): void {
    // TODO: Integrate with crash reporting service
    // Example with Sentry:
    // Sentry.captureMessage(message, level);
    // Sentry.addBreadcrumb({ message, level, data: context });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogLevel, LogContext };