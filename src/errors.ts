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

/** msgSecCheck 命中违规：UGC（user）或 LLM 输出（ai） */
export type ContentRiskKind = 'user' | 'ai';

export class ContentRiskError extends Error {
  public readonly kind: ContentRiskKind;
  /** 命中段在分段后的索引（仅诊断用途） */
  public readonly segmentIndex?: number;
  /** 微信返回的 suggest 字段（risky / review / pass / 无） */
  public readonly suggest?: string;

  constructor(
    message: string,
    kind: ContentRiskKind,
    options?: { cause?: unknown; segmentIndex?: number; suggest?: string }
  ) {
    super(message);
    this.name = 'ContentRiskError';
    this.kind = kind;
    this.segmentIndex = options?.segmentIndex;
    this.suggest = options?.suggest;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/** msgSecCheck 接口本身失败（access_token / 限频 / 网络 / 非违规 errCode） */
export class ContentCheckUnavailableError extends Error {
  /** 微信侧返回的 errCode（如能拿到） */
  public readonly errCode?: number;

  constructor(message: string, options?: { cause?: unknown; errCode?: number }) {
    super(message);
    this.name = 'ContentCheckUnavailableError';
    this.errCode = options?.errCode;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
