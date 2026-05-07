import * as fs from 'fs';
import * as path from 'path';

const EMOTIONAL_CACHE = new Map<string, EmotionalBeatsConfig | null>();
const WARNED_SCENARIOS = new Set<string>();
const EMOTIONAL_HINT_MAX_CHARS = 520;
const ENSEMBLE_BEATS_HINT_MAX_CHARS = 720;

export interface EmotionalBeatTemplate {
  name: string;
  triggerRounds?: number[];
  context: string;
  example: string;
  props: string[];
  emotion: string[];
}

export interface EmotionalIntensityMap {
  low: string;
  medium: string;
  high: string;
}

export interface EnsembleBeatEntry {
  name: string;
  triggerRounds?: number[];
  participants?: string[];
  directorNote?: string;
  /** 最近摘要含任一关键词时弱化本节拍（仍给一句弱提示） */
  suppressKeywords?: string[];
}

export interface OptionalRomanceBeatEntry {
  name: string;
  triggerRounds?: number[];
  /** 0~1，缺省视为 1；与 scenarioId+轮次+名称做确定性抽签 */
  triggerProbability?: number;
  layer?: string;
  historicalNote?: string;
  /** 可选：注入「建议出场 id」短串 */
  participants?: string[];
}

export interface EmotionalBeatsConfig {
  styleTone: string;
  beatTemplates: EmotionalBeatTemplate[];
  ensembleBeats?: EnsembleBeatEntry[];
  optionalRomanceBeats?: OptionalRomanceBeatEntry[];
  triggerHints?: string[];
  suppressionHints?: string[];
  emotionalIntensity?: EmotionalIntensityMap;
  intensityRules?: string[];
  dos?: string[];
  donts?: string[];
}

function emotionalBeatsPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'emotional-beats.json');
}

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

export function loadScenarioEmotionalBeats(scenarioId: string): EmotionalBeatsConfig | null {
  if (EMOTIONAL_CACHE.has(scenarioId)) {
    return EMOTIONAL_CACHE.get(scenarioId) ?? null;
  }
  const filePath = emotionalBeatsPath(scenarioId);
  try {
    if (!fs.existsSync(filePath)) {
      EMOTIONAL_CACHE.set(scenarioId, null);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as EmotionalBeatsConfig;
    EMOTIONAL_CACHE.set(scenarioId, parsed);
    return parsed;
  } catch (e) {
    if (!WARNED_SCENARIOS.has(scenarioId)) {
      WARNED_SCENARIOS.add(scenarioId);
      console.warn(`[emotional-hint] 读取失败：${filePath}`, e);
    }
    EMOTIONAL_CACHE.set(scenarioId, null);
    return null;
  }
}

function containsAny(line: string, keywords: string[]): boolean {
  return keywords.some((kw) => line.includes(kw));
}

/** 0~1 可复现伪随机，用于 optionalRomanceBeats 中签 */
export function deterministicBeatRoll(scenarioId: string, round: number, beatName: string): number {
  const s = `${scenarioId}:${round}:${beatName}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  const u = h >>> 0;
  return (u % 1000) / 1000;
}

function recentBlob(lines: string[]): string {
  return lines.filter((l) => l.trim()).join('；');
}

function ensembleBeatSuppressed(recentSummaryLines: string[], keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const blob = recentBlob(recentSummaryLines.slice(-3));
  return keywords.some((kw) => kw && blob.includes(kw));
}

function optionalBeatLayerTag(layer?: string): string {
  if (layer === 'romance_optional') return '（演义可选层）';
  if (layer === 'historical_canon') return '（正史向参考）';
  return layer ? `（${layer}）` : '';
}

function optionalBeatParticipantPrefix(participants?: string[]): string {
  if (!participants || participants.length === 0) return '';
  return `建议出场 id：${participants.join('、')}。`;
}

function isCrowdedEnsemble(line: string): boolean {
  const keyNpcs = ['曹操', '袁绍', '刘备', '关羽', '张飞', '吕布', '董卓'];
  const hits = keyNpcs.filter((name) => line.includes(name)).length;
  return hits >= 3;
}

export function shouldSuppressEmotionalBeat(
  totalRounds: number,
  recentSummaryLines: string[],
  lastEmotionalRound?: number
): boolean {
  if (typeof lastEmotionalRound === 'number' && totalRounds - lastEmotionalRound < 2) {
    return true;
  }
  const recent = recentSummaryLines.slice(-2);
  const strongConflictWords = ['军议', '出战', '围攻', '围城', '斩', '突袭', '追击'];
  if (recent.some((line) => containsAny(line, strongConflictWords))) {
    return true;
  }
  if (recent.some((line) => isCrowdedEnsemble(line))) {
    return true;
  }
  return false;
}

function resolveAllowedIntensity(totalRounds: number): 'low' | 'medium' | 'high' {
  if (totalRounds <= 10) return 'low';
  if (totalRounds <= 20) return 'medium';
  return 'high';
}

function pickBeat(config: EmotionalBeatsConfig, totalRounds: number): EmotionalBeatTemplate | null {
  if (!config.beatTemplates || config.beatTemplates.length === 0) return null;
  const exact = config.beatTemplates.find((b) => b.triggerRounds?.includes(totalRounds));
  if (exact) return exact;
  const idx = Math.floor(Math.max(totalRounds, 0) / 3) % config.beatTemplates.length;
  return config.beatTemplates[idx] ?? null;
}

export function buildScenarioEmotionalHint(
  scenarioId: string,
  totalRounds: number,
  recentSummaryLines: string[],
  lastEmotionalRound?: number
): string {
  const config = loadScenarioEmotionalBeats(scenarioId);
  if (!config) return '';

  const suppressed = shouldSuppressEmotionalBeat(
    totalRounds,
    recentSummaryLines,
    lastEmotionalRound
  );
  const allowedIntensity = resolveAllowedIntensity(totalRounds);
  const beat = pickBeat(config, totalRounds);
  const beatLine = beat
    ? `候选模板：${beat.name}；语境：${beat.context}；道具：${beat.props.join('、')}；情绪：${beat.emotion.join('、')}；示例：${beat.example}`
    : '候选模板：本轮按剧情自由发挥，保持克制短幕。';
  const suppressLine = suppressed
    ? '本轮建议抑制情感高潮：优先推进冲突/群像调度，情感戏可后置。'
    : '本轮可考虑低频触发情感戏：以 1~2 幕短促呈现，不喧宾夺主。';

  const intensityText = config.emotionalIntensity
    ? {
        low: config.emotionalIntensity.low,
        medium: config.emotionalIntensity.medium,
        high: config.emotionalIntensity.high,
      }[allowedIntensity]
    : '';
  const intensityLine = `强度上限：${allowedIntensity}${intensityText ? `（${intensityText}）` : ''}`;
  const ruleLine =
    config.intensityRules && config.intensityRules.length > 0
      ? `递进规则：${config.intensityRules.join('；')}`
      : '';
  const dosLine =
    config.dos && config.dos.length > 0 ? `建议：${config.dos.join('；')}` : '';
  const dontsLine =
    config.donts && config.donts.length > 0 ? `避免：${config.donts.join('；')}` : '';

  const text = [
    `剧本情感基调：${config.styleTone}`,
    suppressLine,
    intensityLine,
    beatLine,
    ruleLine,
    dosLine,
    dontsLine,
  ]
    .filter(Boolean)
    .join('\n');

  return clip(text, EMOTIONAL_HINT_MAX_CHARS);
}

/**
 * 群像节拍 + 可选演义节拍（读 emotional-beats.json）；与情感 hint 分立，供 prompt 单独段落注入。
 */
export function buildEnsembleBeatsHint(
  scenarioId: string,
  totalRounds: number,
  recentSummaryLines: string[]
): string {
  const config = loadScenarioEmotionalBeats(scenarioId);
  const ens = config?.ensembleBeats;
  const rom = config?.optionalRomanceBeats;
  if ((!ens || ens.length === 0) && (!rom || rom.length === 0)) return '';

  const chunks: string[] = [];
  const recent = recentSummaryLines;

  if (ens && ens.length > 0) {
    for (const b of ens) {
      const rounds = b.triggerRounds ?? [];
      if (rounds.length === 0 || !rounds.includes(totalRounds)) continue;
      const suppressed = ensembleBeatSuppressed(recent, b.suppressKeywords);
      const who = b.participants?.length ? `参与 id：${b.participants.join('、')}。` : '';
      const note = b.directorNote?.trim() ?? '';
      if (suppressed) {
        chunks.push(
          `「${b.name}」节拍窗口在轮次 ${totalRounds}：摘要偏静场/独处时可弱化，仅作背景一句或押后。`
        );
      } else {
        chunks.push(
          `「${b.name}」本轮强推荐群像调度：${who}${note ? note : '宜有 2+ 卡司独立 dialogue。'}`
        );
      }
    }
  }

  if (rom && rom.length > 0) {
    for (const r of rom) {
      const rounds = r.triggerRounds ?? [];
      if (!rounds.includes(totalRounds)) continue;
      const p =
        typeof r.triggerProbability === 'number' && r.triggerProbability >= 0
          ? Math.min(1, r.triggerProbability)
          : 1;
      const roll = deterministicBeatRoll(scenarioId, totalRounds, r.name);
      const hist = r.historicalNote?.trim();
      const layerTag = optionalBeatLayerTag(r.layer);
      const whoOpt = optionalBeatParticipantPrefix(r.participants);
      const histPart = hist ? `参考：${hist}` : '';
      const layerKind = r.layer;

      if (roll < p) {
        if (layerKind === 'historical_canon') {
          chunks.push(
            `「${r.name}」${layerTag}本轮强推荐按史书倾向铺陈；勿将轶闻与民间流传写为定论。${whoOpt}${histPart}`
          );
        } else if (layerKind === 'romance_optional') {
          chunks.push(
            `「${r.name}」${layerTag}本轮强推荐尝试该分幕范式；须区分史书口径与演义叙事套层，勿将传闻写为史实拍板。${whoOpt}${histPart}`
          );
        } else {
          chunks.push(
            `「${r.name}」${layerTag}本轮强推荐尝试该叙事套层；勿将传闻写为史实拍板。${whoOpt}${histPart}`
          );
        }
      } else if (layerKind === 'historical_canon') {
        chunks.push(`「${r.name}」${layerTag}本轮可作弱提示：宜守史书脉络，轶闻仅作侧笔。${whoOpt}${histPart}`);
      } else if (layerKind === 'romance_optional') {
        chunks.push(
          `「${r.name}」${layerTag}本轮可作弱提示：可选演义向叙事套层，勿史实拍板。${whoOpt}${histPart}`
        );
      } else {
        chunks.push(`「${r.name}」${layerTag}本轮可作弱提示：叙事宜克制，勿史实拍板。${whoOpt}${histPart}`);
      }
    }
  }

  if (chunks.length === 0) {
    chunks.push(
      '本轮无配置中的群像/演义节拍窗口；仍宜按【卡司与点名】自然地军议或轮换他者开口。'
    );
  }

  const text = ['【群像节拍引擎提示】', ...chunks.map((c) => `- ${c}`)].join('\n');
  return clip(text, ENSEMBLE_BEATS_HINT_MAX_CHARS);
}
