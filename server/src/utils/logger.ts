/**
 * Logger Utility
 * 
 * Provides consistent logging across the application with
 * environment-appropriate formatting and verbosity.
 */

import config from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

class Logger {
  private minLevel: number;

  constructor() {
    this.minLevel = logLevels[config.logging.level];
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevels[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const reset = colors.reset;
    
    let formatted = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
    
    if (meta && config.logging.prettyPrint) {
      formatted += '\n' + JSON.stringify(meta, null, 2);
    } else if (meta) {
      formatted += ' ' + JSON.stringify(meta);
    }
    
    return formatted;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

export const logger = new Logger();
