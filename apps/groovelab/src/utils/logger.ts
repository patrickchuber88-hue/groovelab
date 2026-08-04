// Structured Enterprise Telemetry & Logger Module for Campus-Groovelab
// Enforces clean log levels and category tags across Dev and Staging

export type LogCategory = 'AUTH' | 'WEBAUTHN' | 'OFFLINE' | 'BILLING' | 'KIOSK' | 'SCHEDULE' | 'SYSTEM';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class StructuredLogger {
  private isDev = typeof window !== 'undefined' ? import.meta.env.DEV : false;

  private formatMessage(level: LogLevel, category: LogCategory, message: string): string {
    const timestamp = new Date().toISOString().substring(11, 19);
    return `[${timestamp}] [${level}] [${category}] ${message}`;
  }

  public debug(category: LogCategory, message: string, data?: any): void {
    if (!this.isDev) return;
    console.debug(this.formatMessage('DEBUG', category, message), data || '');
  }

  public info(category: LogCategory, message: string, data?: any): void {
    console.info(this.formatMessage('INFO', category, message), data || '');
  }

  public warn(category: LogCategory, message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', category, message), data || '');
  }

  public error(category: LogCategory, message: string, error?: any): void {
    console.error(this.formatMessage('ERROR', category, message), error || '');
  }
}

export const logger = new StructuredLogger();
