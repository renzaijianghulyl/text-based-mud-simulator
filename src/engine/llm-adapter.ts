import { LLMConfigError, LLMTransportError } from '../errors';

/** 中国大陆 DashScope 兼容 OpenAI 的 chat 接口（北京） */
const DEFAULT_LLM_API_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
/** 通义千问 3.5 Plus（兼容模式 model 字段，见阿里云百炼文档） */
const DEFAULT_LLM_MODEL_PRIMARY = 'qwen3.5-plus';

const DEFAULT_DEEPSEEK_API_URL =
  'https://api.deepseek.com/v1/chat/completions';

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function getPositiveIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw ? Number(raw) : fallback;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** OpenAI 兼容接口常用 0～2；未设置或非法时返回 defaultVal */
function getTemperatureEnv(defaultVal: number): number {
  const raw = process.env.LLM_TEMPERATURE?.trim();
  if (!raw) return defaultVal;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.min(2, Math.max(0, n));
}

const LLM_TEMPERATURE = getTemperatureEnv(0.7);

/**
 * 云函数默认 60s 时限下，必须把单次模型调用超时控制在更短窗口，
 * 否则会被平台直接 kill，前端只能拿到超时而不是友好错误文案。
 */
const PER_REQUEST_TIMEOUT_MS = getPositiveIntEnv('LLM_REQUEST_TIMEOUT_MS', 12000);
const MAX_OUTPUT_TOKENS_RAW = process.env.LLM_MAX_OUTPUT_TOKENS?.trim();
const MAX_OUTPUT_TOKENS =
  MAX_OUTPUT_TOKENS_RAW && Number.isFinite(Number(MAX_OUTPUT_TOKENS_RAW)) && Number(MAX_OUTPUT_TOKENS_RAW) > 0
    ? Math.floor(Number(MAX_OUTPUT_TOKENS_RAW))
    : undefined;
const ENABLE_JSON_MODE = process.env.LLM_RESPONSE_JSON_MODE !== '0';
/** 云函数（SCF）默认 60s 总时限：同一 provider 重试 2 次极易顶满被强杀，故云端强制最多 1 次。 */
const isCloudRuntime = Boolean(process.env.SCF_NAMESPACE || process.env.TENCENTCLOUD_REGION);
const MAX_ATTEMPTS_PER_PROVIDER = isCloudRuntime
  ? 1
  : getPositiveIntEnv('LLM_MAX_ATTEMPTS_PER_PROVIDER', 2);

interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

interface OpenAICompatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

async function postChatCompletion(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: LLM_TEMPERATURE,
  };
  if (MAX_OUTPUT_TOKENS !== undefined) {
    body.max_tokens = MAX_OUTPUT_TOKENS;
  }
  if (ENABLE_JSON_MODE) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  let json: OpenAICompatResponse;
  try {
    json = JSON.parse(text) as OpenAICompatResponse;
  } catch {
    throw new LLMTransportError('LLM 返回非 JSON', model, { cause: text.slice(0, 500) });
  }

  if (!res.ok) {
    const msg = json.error?.message ?? text.slice(0, 300);
    throw new LLMTransportError(`LLM HTTP ${res.status}: ${msg}`, model);
  }

  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new LLMTransportError('LLM 返回内容为空', model, { cause: json });
  }
  return content;
}

async function callWithRetries(
  label: string,
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_REQUEST_TIMEOUT_MS);
    try {
      return await postChatCompletion(url, apiKey, model, messages, controller.signal);
    } catch (e) {
      lastError = e;
      const reason = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_ATTEMPTS_PER_PROVIDER) {
        // eslint-disable-next-line no-console
        console.warn(`[llm:${label}] 第 ${attempt} 次失败，重试一次: ${reason}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new LLMTransportError(String(lastError), label);
}

/**
 * 调用大模型：主路由 → 失败后切换备路由。
 *
 * 环境变量：
 * - PRIMARY_LLM_API_KEY / PRIMARY_LLM_API_URL / PRIMARY_LLM_MODEL：主路由（推荐）
 * - FALLBACK_LLM_API_KEY / FALLBACK_LLM_API_URL / FALLBACK_LLM_MODEL：备路由（推荐）
 *
 * 向后兼容（仍支持旧变量名）：
 * - LLM_API_KEY / LLM_API_URL / LLM_MODEL_PRIMARY / LLM_MODEL
 * - DEEPSEEK_API_KEY / DEEPSEEK_API_URL / LLM_MODEL_FALLBACK
 */
export async function callLLM(prompt: string): Promise<string> {
  const primaryKey = readEnv('PRIMARY_LLM_API_KEY', 'LLM_API_KEY');
  if (!primaryKey) {
    throw new LLMConfigError('未配置 PRIMARY_LLM_API_KEY');
  }

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const primaryUrl =
    readEnv('PRIMARY_LLM_API_URL', 'LLM_API_URL') || DEFAULT_LLM_API_URL;
  const primaryModel =
    readEnv('PRIMARY_LLM_MODEL', 'LLM_MODEL_PRIMARY', 'LLM_MODEL') ||
    DEFAULT_LLM_MODEL_PRIMARY;

  try {
    return await callWithRetries(
      'qwen',
      primaryUrl,
      primaryKey,
      primaryModel,
      messages
    );
  } catch (primaryErr) {
    const fallbackKey = readEnv('FALLBACK_LLM_API_KEY', 'DEEPSEEK_API_KEY');
    if (!fallbackKey) {
      throw new LLMTransportError(
        '主模型调用失败且未配置 FALLBACK_LLM_API_KEY，无法切换备选',
        'qwen',
        { cause: primaryErr }
      );
    }
    const fallbackModel = readEnv('FALLBACK_LLM_MODEL', 'LLM_MODEL_FALLBACK') || 'deepseek-chat';
    const fallbackUrl =
      readEnv('FALLBACK_LLM_API_URL', 'DEEPSEEK_API_URL') || DEFAULT_DEEPSEEK_API_URL;
    try {
      return await callWithRetries(
        'deepseek',
        fallbackUrl,
        fallbackKey,
        fallbackModel,
        messages
      );
    } catch (fallbackErr) {
      throw new LLMTransportError(
        '主模型与备选模型均调用失败',
        'deepseek',
        { cause: fallbackErr }
      );
    }
  }
}
