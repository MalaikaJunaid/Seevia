/**
 * Seevia Unified Logger
 * Standardizes application logs with module tagging and environment control.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Only log DEBUG and INFO levels during development
const CURRENT_LOG_LEVEL = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

class Logger {
  private formatMessage(level: LogLevel, module: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${level}] [${module.toUpperCase()}]: ${message}`;
  }

  debug(module: string, message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', module, message), data || '');
    }
  }

  info(module: string, message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.info(this.formatMessage('INFO', module, message), data || '');
    }
  }

  warn(module: string, message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', module, message), data || '');
    }
  }

  error(module: string, message: string, error?: any): void {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', module, message), error || '');
      // NOTE: Here is where you would integrate Crashlytics or Sentry
      // Crashlytics().recordError(error);
    }
  }
}

export const logger = new Logger();
