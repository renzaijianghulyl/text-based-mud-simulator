/**
 * 微信内容安全（msgSecCheck v2）封装。
 *
 * 设计要点：
 * - fail-closed：接口本身失败一律抛 ContentCheckUnavailableError（由 interact 映射为友好文案）。
 * - 命中违规（suggest != 'pass' 或 errCode=87014）抛 ContentRiskError。
 * - v2 单次 content ≤ 2500 字符；本模块按 2400 切分（留余量），优先在换行/句末断开。
 * - UGC 与 AI 输出共用同一 checkText；AI 输出再由 checkAiOutputText 拼接。
 * - 仅依赖 wx-server-sdk 的 cloud.openapi.security.msgSecCheck，不自管 access_token。
 */
import * as wxCloud from 'wx-server-sdk';
import { ContentCheckUnavailableError, ContentRiskError, type ContentRiskKind } from '../../errors';
import type { StoryScene } from '../../types';

/** flattenAiText 仅消费这三个字段，避免与 ParseResult 强耦合（ProcessResult 也可直接传入） */
export interface AiTextLike {
  narration?: string;
  dialogue?: string;
  scenes?: StoryScene[];
}

/** 单段最大字符数；v2 上限 2500，留 100 余量 */
const SEGMENT_MAX_CHARS = 2400;
/** 微信内容违规专属 errCode（v2 文档约定） */
const WX_ERRCODE_CONTENT_RISK = 87014;
/** 默认 scene：聊天/资料场景 */
const DEFAULT_SCENE = 1;

/** 轻量初始化：在测试或本地环境无 wx-server-sdk 真实运行时不报错 */
let inited = false;
function ensureInit(): void {
  if (inited) return;
  try {
    wxCloud.init({ env: wxCloud.DYNAMIC_CURRENT_ENV });
  } catch {
    // 测试环境 mock 不需要 init；忽略
  }
  inited = true;
}

/** 是否启用内容安全审核：默认开启；CONTENT_SECURITY_ENABLED=0/false 可关闭（仅本地调试用） */
function isEnabled(): boolean {
  const v = globalThis.process?.env?.CONTENT_SECURITY_ENABLED;
  if (typeof v !== 'string') return true;
  const norm = v.trim().toLowerCase();
  return !(norm === '0' || norm === 'false' || norm === 'off' || norm === 'no');
}

/**
 * 将长文本按 SEGMENT_MAX_CHARS 切分；优先在换行处断开，其次句末（。！？.!?），最后按硬切。
 */
export function splitForCheck(text: string, maxLen: number = SEGMENT_MAX_CHARS): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const segments: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    const window = remaining.slice(0, maxLen);
    let cut = window.lastIndexOf('\n');
    if (cut < Math.floor(maxLen * 0.5)) {
      const sentenceMatch = window.match(/[。！？.!?](?!.*[。！？.!?])/);
      if (sentenceMatch && sentenceMatch.index !== undefined) {
        cut = sentenceMatch.index + 1;
      }
    } else {
      cut += 1; // 包含换行符
    }
    if (cut <= 0 || cut > maxLen) {
      cut = maxLen;
    }
    segments.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining.length > 0) segments.push(remaining);
  return segments;
}

/** 从 wx-server-sdk 抛出的错误中尝试取出 errCode，便于识别 87014 */
function extractErrCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const cand = (err as { errCode?: unknown; code?: unknown }).errCode ?? (err as { code?: unknown }).code;
  if (typeof cand === 'number' && Number.isFinite(cand)) return cand;
  if (typeof cand === 'string') {
    const n = Number(cand);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** 单段调用 msgSecCheck，命中违规抛 ContentRiskError；接口异常抛 ContentCheckUnavailableError */
async function checkSegment(
  content: string,
  openid: string,
  scene: number,
  kind: ContentRiskKind,
  segmentIndex: number
): Promise<void> {
  ensureInit();
  let res: Awaited<ReturnType<typeof wxCloud.openapi.security.msgSecCheck>>;
  try {
    res = await wxCloud.openapi.security.msgSecCheck({
      content,
      version: 2,
      scene,
      openid,
    });
  } catch (e) {
    const errCode = extractErrCode(e);
    if (errCode === WX_ERRCODE_CONTENT_RISK) {
      throw new ContentRiskError('内容命中违规策略（87014）', kind, {
        cause: e,
        segmentIndex,
        suggest: 'risky',
      });
    }
    throw new ContentCheckUnavailableError('msgSecCheck 调用失败', { cause: e, errCode });
  }

  const errCode = res?.errCode;
  if (typeof errCode === 'number' && errCode !== 0) {
    if (errCode === WX_ERRCODE_CONTENT_RISK) {
      throw new ContentRiskError('内容命中违规策略（87014）', kind, {
        segmentIndex,
        suggest: 'risky',
      });
    }
    throw new ContentCheckUnavailableError(`msgSecCheck 返回错误码 ${errCode}`, { errCode });
  }

  const suggest = res?.result?.suggest;
  if (suggest && suggest !== 'pass') {
    throw new ContentRiskError(`内容审核未通过（suggest=${suggest}）`, kind, {
      segmentIndex,
      suggest,
    });
  }
}

export interface CheckTextOptions {
  scene?: number;
  /** 标记本次审核来源：'user'（UGC） / 'ai'（LLM 输出）；用于 ContentRiskError.kind */
  kind?: ContentRiskKind;
}

/**
 * 审核任意文本：空白直接通过；超长按段切分，任一段未通过整体失败。
 * - 命中违规 → 抛 ContentRiskError
 * - 接口异常 → 抛 ContentCheckUnavailableError
 */
export async function checkText(
  text: string,
  openid: string,
  options: CheckTextOptions = {}
): Promise<void> {
  if (!isEnabled()) return;
  const trimmed = (text ?? '').trim();
  if (!trimmed) return;
  if (!openid) {
    // 没有 openid 等同接口不可用，按 fail-closed 处理
    throw new ContentCheckUnavailableError('msgSecCheck 缺少 openid');
  }

  const scene = options.scene ?? DEFAULT_SCENE;
  const kind: ContentRiskKind = options.kind ?? 'user';
  const segments = splitForCheck(text);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.trim()) continue;
    await checkSegment(seg, openid, scene, kind, i);
  }
}

/** 拼接 LLM 输出的可见文本（旁白 + 对话 + 各幕内容），并标记 speaker 防遗漏 */
export function flattenAiText(parsed: AiTextLike): string {
  const parts: string[] = [];
  if (parsed.narration) parts.push(parsed.narration);
  if (parsed.dialogue) parts.push(parsed.dialogue);
  if (Array.isArray(parsed.scenes)) {
    for (const s of parsed.scenes) {
      if (!s || typeof s.content !== 'string') continue;
      const content = s.content.trim();
      if (!content) continue;
      const speaker = typeof s.speaker === 'string' && s.speaker.trim() ? s.speaker.trim() : '';
      parts.push(speaker ? `${speaker}：${content}` : content);
    }
  }
  return parts.join('\n');
}

/** 审核 LLM 输出（合并旁白/对话/各幕，按段切分调用 msgSecCheck，kind='ai'） */
export async function checkAiOutputText(
  parsed: AiTextLike,
  openid: string,
  options: { scene?: number } = {}
): Promise<void> {
  const text = flattenAiText(parsed);
  await checkText(text, openid, { scene: options.scene, kind: 'ai' });
}
