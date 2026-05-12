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

/** 云函数新开局尚未支持该 scenarioId（如线上包未更新）。 */
export class ScenarioUnsupportedError extends Error {
  constructor(public readonly scenarioId: string) {
    super(`云函数新开局暂不支持剧本：${scenarioId}`);
    this.name = 'ScenarioUnsupportedError';
  }
}

/** 赤壁 NPC 静态注册表缺失或损坏（需重新 codegen 并打包）。 */
export class ChibiNpcRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChibiNpcRegistryError';
  }
}

/** 玄武门剧本 NPC 静态注册表缺失或损坏（需重新 codegen 并打包）。 */
export class XuanwuMenNpcRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XuanwuMenNpcRegistryError';
  }
}

/** 商鞅变法剧本 NPC 静态注册表缺失或损坏（需重新 codegen 并打包）。 */
export class ShangYangBianFaNpcRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShangYangBianFaNpcRegistryError';
  }
}
