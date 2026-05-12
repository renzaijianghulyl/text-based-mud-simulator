import Taro from '@tarojs/taro';

export type CloudCallFunctionResult = { result: unknown };

/**
 * 统一解析云函数 `interact` 的返回体（少数环境下 `result` 可能为 JSON 字符串或非对象）。
 */
export function getInteractPayload(res: CloudCallFunctionResult): Record<string, unknown> {
  let raw: unknown = res.result;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

/** 与云函数 `checkSessionOnly` 语义对齐：仅当显式 `exists === true` 且未失败时视为有档 */
export function readSessionExistsFlag(payload: Record<string, unknown>): boolean {
  if (payload.success === false) return false;
  return payload.exists === true;
}

type CallFunctionCompat = (opts: {
  name: string;
  data?: Record<string, unknown>;
  config?: { timeout?: number };
}) => Promise<CloudCallFunctionResult>;

/**
 * 微信小程序 wx.cloud.callFunction 支持 config.timeout，Taro 自带类型未声明，
 * 在此集中断言，避免各页面重复 any。
 */
export async function callCloudFunctionWithTimeout(options: {
  name: string;
  data?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<CloudCallFunctionResult> {
  const { name, data, timeoutMs } = options;
  const call = Taro.cloud.callFunction as unknown as CallFunctionCompat;
  return call({
    name,
    data,
    ...(timeoutMs !== undefined ? { config: { timeout: timeoutMs } } : {}),
  });
}
