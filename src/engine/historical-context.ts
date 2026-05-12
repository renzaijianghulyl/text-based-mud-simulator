import * as fs from 'fs';
import * as path from 'path';
import type { ParseResult, StoryScene } from '../types';

const CONTEXT_CACHE = new Map<string, HistoricalContextFile | null>();
const WARN_ONCE_MISSING = new Set<string>();

const HINT_MAX_CHARS = 900;
const DRAMATIC_REL_HINT_MAX = 520;

export interface HistoricalPresentEntry {
  npcId: string;
  role: string;
  status: string;
  note?: string;
}

export interface HistoricalAbsentEntry {
  npcId: string;
  labels?: string[];
  reason: string;
  forbiddenUntil?: number | null;
  location?: string;
  note?: string;
  /** 默认 true：禁止以 dialogue 的 speaker 正名出场；false 时仅作背景提示（如荀彧在后方） */
  forbidDialogueSpeaker?: boolean;
}

export interface HistoricalForbiddenEvent {
  label: string;
  keywords: string[];
  severity: 'hard' | 'soft';
  actualYear?: number;
  reason: string;
  killer?: string;
}

export interface DramaticRelationshipFacet {
  tone?: string;
  note?: string;
}

/** 「公开场合 / 私下」戏剧关系；JSON 键名为 public / private */
export interface DramaticRelationshipEntry {
  from: string;
  to: string;
  'public': DramaticRelationshipFacet;
  'private'?: DramaticRelationshipFacet;
}

export interface HistoricalRelationship {
  from: string;
  to: string;
  relationship: string;
  addressForm: string;
  forbiddenAddress?: string[];
  knowledgeLevel: string;
  note?: string;
}

export interface HistoricalAddressRules {
  description?: string;
  rules: string[];
}

export interface HistoricalContextFile {
  period: {
    year: number;
    eraName: string;
    season: string;
    event: string;
  };
  location: {
    current: string;
    caoCaoBase: string;
    forbiddenLocations: string[];
  };
  characters: {
    present: HistoricalPresentEntry[];
    absent: HistoricalAbsentEntry[];
  };
  forbiddenEvents: HistoricalForbiddenEvent[];
  historicalNotes: string[];
  relationships?: HistoricalRelationship[];
  /** 戏剧张力边（与称谓向 relationships 并列，不替代） */
  dramaticRelationships?: DramaticRelationshipEntry[];
  addressRules?: HistoricalAddressRules;
}

function historicalContextPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'historical-context.json');
}

function scenarioNpcPath(scenarioId: string, npcId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'npcs', `${npcId}.json`);
}

interface NpcNameFile {
  name?: string;
  aliases?: string[];
}

function readNpcLabels(scenarioId: string, npcId: string): string[] {
  const p = scenarioNpcPath(scenarioId, npcId);
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf-8');
    const j = JSON.parse(raw) as NpcNameFile;
    const out: string[] = [];
    if (j.name?.trim()) out.push(j.name.trim());
    if (Array.isArray(j.aliases)) {
      for (const a of j.aliases) {
        if (typeof a === 'string' && a.trim()) out.push(a.trim());
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * 读取并缓存剧本历史背景；缺失时返回 null（不伪造内容）。
 */
export function loadHistoricalContext(scenarioId: string): HistoricalContextFile | null {
  if (CONTEXT_CACHE.has(scenarioId)) {
    return CONTEXT_CACHE.get(scenarioId) ?? null;
  }
  const filePath = historicalContextPath(scenarioId);
  try {
    if (!fs.existsSync(filePath)) {
      CONTEXT_CACHE.set(scenarioId, null);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as HistoricalContextFile;
    CONTEXT_CACHE.set(scenarioId, parsed);
    return parsed;
  } catch (e) {
    if (!WARN_ONCE_MISSING.has(scenarioId)) {
      WARN_ONCE_MISSING.add(scenarioId);
      console.warn(`[historical-context] 读取失败：${filePath}`, e);
    }
    CONTEXT_CACHE.set(scenarioId, null);
    return null;
  }
}

function clipHint(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/**
 * 生成注入 prompt 的「历史背景与约束」正文；无配置时返回空串。
 */
export function buildHistoricalContextHint(scenarioId: string): string {
  const ctx = loadHistoricalContext(scenarioId);
  if (!ctx) return '';

  const presentLine =
    ctx.characters.present.length > 0
      ? ctx.characters.present.map((c) => `${c.npcId}（${c.role}${c.note ? `；${c.note}` : ''}）`).join('；')
      : '（未列）';

  const absentLine =
    ctx.characters.absent.length > 0
      ? ctx.characters.absent.map((a) => `${a.npcId}：${a.reason}`).join('；')
      : '（未列）';

  const hardEvents = ctx.forbiddenEvents.filter((e) => e.severity === 'hard' && e.keywords.length > 0);
  const softEvents = ctx.forbiddenEvents.filter((e) => e.severity === 'soft');

  const hardBlock =
    hardEvents.length > 0
      ? hardEvents.map((e) => `- ${e.label}：${e.keywords.join('、')}（${e.reason}${e.actualYear != null ? `，约 ${e.actualYear} 年语境` : ''}）`).join('\n')
      : '（无硬性子串告警项）';

  const softBlock =
    softEvents.length > 0
      ? softEvents.map((e) => `- ${e.label}：${e.reason}`).join('\n')
      : '';

  const forbidLoc = ctx.location.forbiddenLocations.join('、');

  const notes = ctx.historicalNotes.join('\n- ');

  const parts = [
    `时间锚点：${ctx.period.eraName}（${ctx.period.year} 年）${ctx.period.season}；事件脉络：${ctx.period.event}。`,
    `主场景：${ctx.location.current}。与主场景对位或侧翼的叙事锚点宜表述为：${ctx.location.caoCaoBase}。`,
    `禁止当作「此时已定型」的都城/中心地名（自动校验用）：${forbidLoc}。`,
    `在场角色参考：${presentLine}`,
    `缺席或不宜以前线对白正名出场：${absentLine}`,
    '【勿混淆后期史实与演义】可写民间流传，但若写「史书口径」须与本时间锚一致；玩家混用典故时 NPC 可纠偏。',
    '【硬性避免在叙事中当作已发生】（下列短语出现即易穿帮）：',
    hardBlock,
  ];
  if (softBlock) {
    parts.push('【软性叙事提醒】（不触发自动告警，仅导演参考）：', softBlock);
  }
  parts.push('【编年注释】', `- ${notes}`);

  return clipHint(parts.join('\n'), HINT_MAX_CHARS);
}

/**
 * 生成「当前主 NPC 视角」的人物关系与称谓约束提示。
 */
export function buildRelationshipHint(scenarioId: string, currentNpcId: string): string {
  const ctx = loadHistoricalContext(scenarioId);
  if (!ctx?.relationships || ctx.relationships.length === 0) return '';

  const related = ctx.relationships.filter((r) => r.from === currentNpcId);
  if (related.length === 0) return '';

  const relLines = related.map((r) => {
    const forbidden =
      r.forbiddenAddress && r.forbiddenAddress.length > 0
        ? `；禁称：${r.forbiddenAddress.join('、')}`
        : '';
    const note = r.note ? `；注：${r.note}` : '';
    return `- ${r.to}：${r.relationship}；建议称谓：${r.addressForm}${forbidden}；认知：${r.knowledgeLevel}${note}`;
  });

  const ruleLines = ctx.addressRules?.rules ?? ['熟悉者可用表字，不熟者优先用全名。'];
  const ruleDesc = ctx.addressRules?.description ? `${ctx.addressRules.description}\n` : '';

  return [
    `当前视角：${currentNpcId}（${ctx.period.eraName} ${ctx.period.year} 年）`,
    '【对人关系与称谓】',
    ...relLines,
    '【称谓规则】',
    `${ruleDesc}${ruleLines.map((r) => `- ${r}`).join('\n')}`,
  ].join('\n');
}

function clipDramaticHint(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/**
 * 戏剧关系张力（当前主 NPC 为 from 或 to 的边；与称谓表分立）。
 */
export function buildDramaticRelationshipsHint(scenarioId: string, currentNpcId: string): string {
  const ctx = loadHistoricalContext(scenarioId);
  const list = ctx?.dramaticRelationships;
  if (!list || list.length === 0) return '';

  const lines: string[] = [];
  for (const r of list) {
    const pub = r['public'];
    const priv = r['private'];
    if (r.from === currentNpcId) {
      const pubLine = [pub?.tone, pub?.note].filter(Boolean).join('；');
      const privLine = priv ? [priv.tone, priv.note].filter(Boolean).join('；') : '';
      lines.push(
        `- 你对 ${r.to}：公开—${pubLine || '（未注）'}${privLine ? `；私下—${privLine}` : ''}`
      );
    } else if (r.to === currentNpcId) {
      const pubLine = [pub?.tone, pub?.note].filter(Boolean).join('；');
      const privLine = priv ? [priv.tone, priv.note].filter(Boolean).join('；') : '';
      lines.push(
        `- ${r.from} 对 你：公开—${pubLine || '（未注）'}${privLine ? `；私下—${privLine}` : ''}`
      );
    }
  }

  if (lines.length === 0) return '';

  const body = [`当前视角：${currentNpcId}`, '【戏剧关系（公开与私下张力，非称谓表）】', ...lines].join('\n');
  return clipDramaticHint(body, DRAMATIC_REL_HINT_MAX);
}

function mergeAbsentLabels(scenarioId: string, entry: HistoricalAbsentEntry): string[] {
  const fromFile = readNpcLabels(scenarioId, entry.npcId);
  const fromJson = (entry.labels ?? []).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of [...fromJson, ...fromFile]) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function buildCheckText(parsed: ParseResult): string {
  const sceneStr =
    parsed.scenes && parsed.scenes.length > 0 ? JSON.stringify(parsed.scenes) : '';
  return `${parsed.narration}\n${parsed.dialogue}\n${sceneStr}`;
}

function dialogueSpeakers(scenes: StoryScene[] | undefined): string[] {
  if (!scenes?.length) return [];
  return scenes
    .filter((s) => s.type === 'dialogue' && typeof s.speaker === 'string' && s.speaker.trim())
    .map((s) => s.speaker!.trim());
}

function sceneBySpeaker(scenes: StoryScene[] | undefined, speaker: string): StoryScene[] {
  if (!scenes?.length) return [];
  return scenes.filter((s) => s.type === 'dialogue' && s.speaker?.trim() === speaker);
}

function looksLikeQuoteContext(content: string, forbidden: string): boolean {
  const quoteHints = [
    `汝言${forbidden}`,
    `你言${forbidden}`,
    `你说${forbidden}`,
    `世人称${forbidden}`,
    `所谓${forbidden}`,
    `人皆称${forbidden}`,
    `俗称${forbidden}`,
    `或称${forbidden}`,
    `号${forbidden}`,
  ];
  return quoteHints.some((h) => content.includes(h));
}

function looksLikeDirectAddress(content: string, forbidden: string): boolean {
  const normalized = content.replace(/\s+/g, '');
  const directPatterns = [
    new RegExp(`^${forbidden}[，,：:]`),
    new RegExp(`[。！？!?；;，,]${forbidden}[，,：:]`),
    new RegExp(`吾问${forbidden}`),
    new RegExp(`我问${forbidden}`),
    new RegExp(`唤${forbidden}`),
    new RegExp(`召${forbidden}`),
  ];
  return directPatterns.some((re) => re.test(normalized));
}

/**
 * 宽松启发式：命中则供引擎打日志，不抛错、不重试。
 */
export function collectHistoricalWarnings(scenarioId: string, parsed: ParseResult): string[] {
  const ctx = loadHistoricalContext(scenarioId);
  if (!ctx) return [];

  const violations: string[] = [];
  const text = buildCheckText(parsed);

  for (const loc of ctx.location.forbiddenLocations) {
    if (!loc) continue;
    if (text.includes(loc)) {
      violations.push(`地点/都城用语可能越界：出现「${loc}」（${ctx.period.year} 年语境下宜用「${ctx.location.caoCaoBase}」等表述）`);
    }
  }

  for (const ev of ctx.forbiddenEvents) {
    if (ev.severity !== 'hard') continue;
    for (const kw of ev.keywords) {
      if (kw && text.includes(kw)) {
        violations.push(`后期事件用语：「${kw}」（${ev.label}；${ev.reason}）`);
      }
    }
  }

  for (const abs of ctx.characters.absent) {
    const forbid = abs.forbidDialogueSpeaker !== false;
    if (!forbid) continue;
    const labels = mergeAbsentLabels(scenarioId, abs);
    if (labels.length === 0) continue;
    const labelSet = new Set(labels);
    for (const sp of dialogueSpeakers(parsed.scenes)) {
      if (sp === '你') continue;
      if (labelSet.has(sp)) {
        violations.push(`人物出场：dialogue speaker「${sp}」属本时期不宜以前线对白正名出场之列（${abs.reason}）`);
      }
    }
  }

  return violations;
}

/**
 * 称谓违规宽松检查：仅检查当前主 NPC 的 dialogue，命中后用于 warn，不抛错。
 */
export function collectAddressWarnings(
  scenarioId: string,
  currentNpcId: string,
  currentNpcSpeaker: string,
  parsed: ParseResult
): string[] {
  const ctx = loadHistoricalContext(scenarioId);
  if (!ctx?.relationships || !parsed.scenes || parsed.scenes.length === 0) return [];

  const violations: string[] = [];
  const rels = ctx.relationships.filter(
    (r) =>
      r.from === currentNpcId &&
      Array.isArray(r.forbiddenAddress) &&
      r.forbiddenAddress.length > 0
  );
  if (rels.length === 0) return [];

  const dialogues = sceneBySpeaker(parsed.scenes, currentNpcSpeaker);
  for (const scene of dialogues) {
    const content = scene.content ?? '';
    for (const rel of rels) {
      for (const forbidden of rel.forbiddenAddress ?? []) {
        if (!forbidden || !content.includes(forbidden)) continue;
        if (looksLikeQuoteContext(content, forbidden)) continue;
        if (!looksLikeDirectAddress(content, forbidden)) continue;
        violations.push(
          `称谓可能越界：${currentNpcSpeaker} 对 ${rel.to} 使用「${forbidden}」；建议用「${rel.addressForm}」`
        );
      }
    }
  }
  return violations;
}
