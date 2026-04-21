import { LLMConfigError, LLMTransportError } from '../errors';

/** 中国大陆 DashScope 兼容 OpenAI 的 chat 接口（北京） */
const DEFAULT_LLM_API_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
/** 通义千问 3.5 Plus（兼容模式 model 字段，见阿里云百炼文档） */
const DEFAULT_LLM_MODEL_PRIMARY = 'qwen3.5-plus';

const DEFAULT_DEEPSEEK_API_URL =
  'https://api.deepseek.com/v1/chat/completions';

function getPositiveIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw ? Number(raw) : fallback;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * 云函数默认 60s 时限下，必须把单次模型调用超时控制在更短窗口，
 * 否则会被平台直接 kill，前端只能拿到超时而不是友好错误文案。
 */
const PER_REQUEST_TIMEOUT_MS = getPositiveIntEnv('LLM_REQUEST_TIMEOUT_MS', 12000);
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
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
 * 调用大模型：通义千问（主）→ 超时或失败后重试 1 次 → 仍失败则切换 DeepSeek（若配置了 DEEPSEEK_API_KEY）。
 *
 * 环境变量：
 * - LLM_API_KEY：必填，DashScope API Key
 * - LLM_API_URL：可选，主模型 chat 完整 URL，默认北京兼容端点
 * - LLM_MODEL_PRIMARY 或 LLM_MODEL：可选，主模型名，默认 qwen3.5-plus
 * - DEEPSEEK_API_KEY / DEEPSEEK_API_URL / LLM_MODEL_FALLBACK：备选 DeepSeek
 */
export async function callLLM(prompt: string): Promise<string> {
  const primaryKey = process.env.LLM_API_KEY?.trim();
  if (!primaryKey) {
    throw new LLMConfigError('未配置 LLM_API_KEY');
  }

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const primaryUrl =
    process.env.LLM_API_URL?.trim() || DEFAULT_LLM_API_URL;
  const primaryModel =
    process.env.LLM_MODEL_PRIMARY?.trim() ||
    process.env.LLM_MODEL?.trim() ||
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
    const fallbackKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!fallbackKey) {
      throw new LLMTransportError(
        '主模型调用失败且未配置 DEEPSEEK_API_KEY，无法切换备选',
        'qwen',
        { cause: primaryErr }
      );
    }
    const fallbackModel = process.env.LLM_MODEL_FALLBACK?.trim() || 'deepseek-chat';
    const fallbackUrl =
      process.env.DEEPSEEK_API_URL?.trim() || DEFAULT_DEEPSEEK_API_URL;
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
