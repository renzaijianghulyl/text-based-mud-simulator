type LogLevel = 'info' | 'warn' | 'error';

function stamp(): string {
  return new Date().toISOString();
}

export function logEngine(level: LogLevel, step: string, message: string, meta?: unknown): void {
  const line = `[${stamp()}] [engine:${level}] ${step} — ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'info' ? 'log' : level](line, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'info' ? 'log' : level](line);
  }
}
