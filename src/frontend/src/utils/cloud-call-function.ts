import Taro from '@tarojs/taro';

export type CloudCallFunctionResult = { result: Record<string, unknown> };

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
