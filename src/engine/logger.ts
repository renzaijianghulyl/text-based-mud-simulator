type LogLevel = 'info' | 'warn' | 'error';
const latencyBuckets = new Map<string, number[]>();

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

export function beginTimer(): number {
  return Date.now();
}

export function recordLatency(step: string, startedAt: number): number {
  const ms = Date.now() - startedAt;
  const arr = latencyBuckets.get(step) ?? [];
  arr.push(ms);
  if (arr.length > 200) {
    arr.shift();
  }
  latencyBuckets.set(step, arr);
  return ms;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function logLatencySummary(step: string): void {
  const arr = latencyBuckets.get(step);
  if (!arr || arr.length < 5) return;
  const sum = arr.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / arr.length);
  const p50 = percentile(arr, 50);
  const p95 = percentile(arr, 95);
  // eslint-disable-next-line no-console
  console.log(`[${stamp()}] [engine:info] ${step} — latency avg=${avg}ms p50=${p50}ms p95=${p95}ms n=${arr.length}`);
}
