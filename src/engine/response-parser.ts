import type { ParseResult, StateChanges, StoryScene, StorySceneType } from '../types';
import { ParseResponseError } from '../errors';

function stripBomAndTrim(text: string): string {
  return text.replace(/^\uFEFF/, '').trim();
}

/**
 * 从首个 `{` 起按括号深度截取完整对象（忽略字符串内的括号）。
 */
function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function collectFenceContents(text: string): string[] {
  const out: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]?.trim();
    if (inner) {
      out.push(inner);
    }
  }
  return out;
}

/** 仅结构修复：去掉 } 或 ] 前的多余逗号（常见模型笔误）。不做字段名改写。 */
function repairTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, '$1');
}

function tryParseJson(raw: string): unknown {
  const trimmed = stripBomAndTrim(raw);
  if (!trimmed) {
    throw new SyntaxError('empty');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return JSON.parse(repairTrailingCommas(trimmed));
  }
}

function collectJsonCandidates(llmText: string): string[] {
  const t = stripBomAndTrim(llmText);
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (s: string) => {
    const x = stripBomAndTrim(s);
    if (x && !seen.has(x)) {
      seen.add(x);
      candidates.push(x);
    }
  };

  push(t);

  for (const fence of collectFenceContents(t)) {
    push(fence);
    const bal = extractBalancedJsonObject(fence);
    if (bal) {
      push(bal);
    }
  }

  const balanced = extractBalancedJsonObject(t);
  if (balanced) {
    push(balanced);
  }

  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end > start) {
    push(t.slice(start, end + 1));
  }

  return candidates;
}

function parseRootObject(llmText: string): Record<string, unknown> {
  const trimmed = stripBomAndTrim(llmText);
  if (!trimmed.includes('{')) {
    throw new ParseResponseError('未在输出中找到 JSON 对象');
  }

  const candidates = collectJsonCandidates(llmText);
  if (candidates.length === 0) {
    throw new ParseResponseError('未在输出中找到 JSON 对象');
  }

  let lastCause: unknown;
  for (const c of candidates) {
    try {
      const obj = tryParseJson(c);
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        return obj as Record<string, unknown>;
      }
    } catch (e) {
      lastCause = e;
    }
  }
  throw new ParseResponseError('JSON 解析失败', { cause: lastCause });
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) {
      return n;
    }
  }
  throw new ParseResponseError(`字段 ${field} 必须为有限数字`);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ParseResponseError(`字段 ${field} 必须为非空字符串`);
  }
  return value.trim();
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ParseResponseError(`字段 ${field} 必须为字符串`);
  }
  return value.trim();
}

function asStorySceneType(value: unknown, field: string): StorySceneType {
  if (value === 'narration' || value === 'action' || value === 'dialogue') {
    return value;
  }
  throw new ParseResponseError(`字段 ${field} 必须为 narration/action/dialogue 之一`);
}

function asStoryScenes(raw: unknown): StoryScene[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ParseResponseError('scenes 必须为非空数组');
  }
  if (raw.length > 12) {
    throw new ParseResponseError('scenes 数量超限（最多 12 幕）');
  }
  const out: StoryScene[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ParseResponseError(`scenes[${i}] 必须为对象`);
    }
    const rec = item as Record<string, unknown>;
    const type = asStorySceneType(rec.type, `scenes[${i}].type`);
    const content = asNonEmptyString(rec.content, `scenes[${i}].content`);
    const speakerRaw = rec.speaker;
    const speaker =
      typeof speakerRaw === 'string' && speakerRaw.trim().length > 0 ? speakerRaw.trim() : undefined;
    if (type === 'dialogue' && !speaker) {
      throw new ParseResponseError(`scenes[${i}].speaker 在 dialogue 幕中不能为空`);
    }
    const durationRaw = rec.durationMs;
    const durationMs =
      durationRaw === undefined ? undefined : asFiniteNumber(durationRaw, `scenes[${i}].durationMs`);
    out.push({ type, content, speaker, durationMs });
  }
  return out;
}

function deriveNarrationFromScenes(scenes: StoryScene[]): string {
  return scenes.map((scene) => scene.content).join('\n\n').trim();
}

function deriveDialogueFromScenes(scenes: StoryScene[]): string {
  const lines = scenes
    .filter((scene) => scene.type === 'dialogue' && scene.speaker && scene.speaker !== '你')
    .map((scene) => `${scene.speaker}：${scene.content}`);
  return lines.join('\n').trim();
}

/**
 * stateChanges 须为对象；若模型输出为 JSON 字符串，则再解析一层（仍要求键名为 hp / relationship）。
 */
function asStateChangesRecord(raw: unknown): Record<string, unknown> {
  /** 模型偶发把 stateChanges 写成单元素数组，视为结构噪声而非字段映射 */
  if (Array.isArray(raw)) {
    if (raw.length === 1 && typeof raw[0] === 'object' && raw[0] !== null && !Array.isArray(raw[0])) {
      return raw[0] as Record<string, unknown>;
    }
    throw new ParseResponseError('stateChanges 必须为对象');
  }
  if (typeof raw === 'string') {
    const s = stripBomAndTrim(raw);
    if (!s.startsWith('{')) {
      throw new ParseResponseError('stateChanges 必须为对象');
    }
    let inner: unknown;
    try {
      inner = tryParseJson(s);
    } catch (e) {
      throw new ParseResponseError('stateChanges 字符串无法解析为 JSON 对象', { cause: e });
    }
    if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
      throw new ParseResponseError('stateChanges 必须为对象');
    }
    return inner as Record<string, unknown>;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ParseResponseError('stateChanges 必须为对象');
  }
  return raw as Record<string, unknown>;
}

/**
 * 从 LLM 原始文本中解析 JSON，提取 narration、dialogue、stateChanges。
 * 结构容错：前后说明文字、代码围栏、首尾多余文本、尾随逗号、stateChanges 嵌套 JSON 字符串、数字以字符串形式给出。
 * 不做字段别名映射；解析失败抛出 ParseResponseError（不使用默认值填充缺失字段）。
 */
export function parseResponse(llmText: string): ParseResult {
  const root = parseRootObject(llmText);
  const scenes = asStoryScenes(root.scenes);
  const narration = deriveNarrationFromScenes(scenes);
  const dialogue = deriveDialogueFromScenes(scenes);
  if (!narration) {
    throw new ParseResponseError('scenes 解析后 narration 不能为空');
  }
  /** 仅旁白/动作、或仅有玩家台词时派生 dialogue 为空；开局铺景等合法，不要求凑 NPC 对白 */

  const sc = asStateChangesRecord(root.stateChanges);
  const hp = asFiniteNumber(sc.hp, 'stateChanges.hp');
  const relationship = asFiniteNumber(sc.relationship, 'stateChanges.relationship');
  const reason =
    typeof sc.reason === 'string' && sc.reason.length > 0 ? sc.reason.trim() : undefined;

  const stateChanges: StateChanges = { hp, relationship, reason };
  return { narration, dialogue, stateChanges, scenes };
}

/**
 * 校验解析结果是否满足引擎写入状态前的业务约束（仍不使用默认值修补）。
 */
export function validateParse(result: ParseResult): boolean {
  try {
    asNonEmptyString(result.narration, 'narration');
    if (typeof result.dialogue !== 'string') {
      return false;
    }
    asFiniteNumber(result.stateChanges.hp, 'stateChanges.hp');
    asFiniteNumber(result.stateChanges.relationship, 'stateChanges.relationship');
    return true;
  } catch {
    return false;
  }
}
