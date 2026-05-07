export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

export class LLMTransportError extends Error {
  public readonly provider: string;

  constructor(message: string, provider: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'LLMTransportError';
    this.provider = provider;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class ParseResponseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ParseResponseError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class SessionNotFoundError extends Error {
  constructor(public readonly sessionId: string) {
    super('会话已过期，请重新开始');
    this.name = 'SessionNotFoundError';
  }
}

/** 云数据库读写失败（由 interact 映射为 DB_ERROR 用户文案）。 */
export class CloudDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'CloudDatabaseError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
