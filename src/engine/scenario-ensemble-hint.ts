import * as fs from 'fs';
import * as path from 'path';

/** 卡司名单注入上限（中文约 2 字 ≈ 1 token，此处仅作长度护栏） */
const ENSEMBLE_HINT_MAX_CHARS = 520;

export interface ScenarioNpcFileForEnsemble {
  id: string;
  name: string;
  aliases?: string[];
}

interface ScenarioConfigForEnsemble {
  availableNpcs?: string[];
  npcRoles?: Record<string, string>;
}

function scenarioConfigPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'config.json');
}

function scenarioNpcPath(scenarioId: string, npcId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'npcs', `${npcId}.json`);
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 只读拼装「本局可出现台词的卡司」提示，供 buildPrompt 注入。
 * 读取失败时返回空串（不伪造名单）。
 * @param eliminatedNpcIds 已退场卡司 id，从名单与强推语义中剔除（仍可在导演稿中禁止生者对白）。
 */
export function getScenarioEnsembleHint(
  scenarioId: string,
  eliminatedNpcIds?: readonly string[]
): string {
  try {
    const config = readJsonFile<ScenarioConfigForEnsemble>(scenarioConfigPath(scenarioId));
    const eliminated = new Set((eliminatedNpcIds ?? []).filter(Boolean));
    const availableNpcs =
      config?.availableNpcs?.filter((id) => typeof id === 'string' && id.trim() && !eliminated.has(id)) ??
      [];
    if (availableNpcs.length === 0) return '';

    const labelsOrdered: string[] = [];
    const seen = new Set<string>();

    const pushLabel = (s: string) => {
      const t = s.trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      labelsOrdered.push(t);
    };

    for (const npcId of availableNpcs) {
      const npc = readJsonFile<ScenarioNpcFileForEnsemble>(scenarioNpcPath(scenarioId, npcId));
      if (!npc?.name) continue;
      pushLabel(npc.name);
      if (npc.aliases && npc.aliases.length > 0) {
        for (const a of npc.aliases) {
          pushLabel(a);
        }
      }
    }

    if (labelsOrdered.length === 0) return '';

    let joined = labelsOrdered.join('、');
    while (joined.length > ENSEMBLE_HINT_MAX_CHARS && labelsOrdered.length > 1) {
      labelsOrdered.pop();
      joined = labelsOrdered.join('、');
    }
    if (joined.length > ENSEMBLE_HINT_MAX_CHARS) {
      joined = `${joined.slice(0, ENSEMBLE_HINT_MAX_CHARS)}…`;
    }

    const roles = config?.npcRoles;
    let roleLine = '';
    if (roles && typeof roles === 'object') {
      const parts: string[] = [];
      for (const npcId of availableNpcs) {
        const r = roles[npcId];
        if (typeof r === 'string' && r.trim()) parts.push(`${npcId}：${r.trim()}`);
      }
      if (parts.length > 0) {
        roleLine = `【卡司职能短注】${parts.join('；')}。`;
        const cap = Math.max(80, ENSEMBLE_HINT_MAX_CHARS - joined.length - 120);
        if (roleLine.length > cap) roleLine = `${roleLine.slice(0, cap)}…`;
      }
    }

    const deadNote =
      eliminated.size > 0
        ? `【已退场（不得以生者 dialogue 再出场）】以下 id 已从本名单剔除：${[...eliminated].join('、')}。`
        : '';
    const base = `【本剧本可出现台词的 NPC】${joined}。玩家点名（含名、字、号等称呼）时，对应 NPC 必须在本轮 scenes 中出场并有独立 dialogue 幕（speaker 须为该 NPC 正名）；禁止由当前主 NPC 一句带过代替其立场与台词（禁止「代答」）。`;
    const body = roleLine ? `${base}\n${roleLine}` : base;
    return deadNote ? `${deadNote}\n${body}` : body;
  } catch (e) {
    console.warn('[ensemble-hint] 读取失败', e);
    return '';
  }
}

/**
 * 群像与轮次弹性提示：生成自然语言段落供导演参考，不暴露可执行逻辑给模型。
 */
export function getEnsembleElasticPromptLine(
  totalRounds: number,
  recentSummaryLines: string[],
  eliminatedNpcIds?: readonly string[]
): string {
  const eliminatedCount = (eliminatedNpcIds ?? []).filter(Boolean).length;
  const lines = recentSummaryLines.filter((l) => l.trim().length > 0);
  const isSmallTalk =
    lines.length > 0 &&
    lines.every(
      (line) =>
        line.includes('寒暄') || line.includes('休整') || line.includes('待命')
    );
  const cycleSuggest = totalRounds > 0 && totalRounds % 4 === 0 && !isSmallTalk;

  const deadElastic =
    eliminatedCount > 0
      ? '本局已有卡司退场：【卡司与点名】中「至少一人独立 dialogue」不得指向已退场 id；须改由名单内活人承担。'
      : '';
  const chunks: string[] = [
    '【群像节奏（引擎提示，勿当硬性轮次 KPI）】若滚动摘要长期只有当前主 NPC 与玩家对答、缺少营帐外动静，宜在因果成立时插入斥候、传令、武将请战、谋士献策等；若本局 prompt 中已出现【卡司与点名】段落，则宜让该名单所列角色中至少一人以独立 dialogue 幕开口（可先一幕 action 再下一幕 dialogue）。纯休整语境不必每轮打断；但若多轮摘要仍完全静止，宜轻微写出远处人声、甲叶、马蹄等以保持战场感。',
    ...(deadElastic ? [deadElastic] : []),
  ];
  if (isSmallTalk) {
    chunks.push(
      '近期摘要似偏寒暄/休整/待命：可先维持休整氛围；若已连续多轮毫无外部参照，仍建议偶写营伍细小动态，避免世界像停表。'
    );
  } else if (cycleSuggest) {
    chunks.push(
      '当前总轮次约满一小节叙事节奏点：若非纯休整语境，可优先安排一名非当前主对话焦点的卡司 NPC 独立发言（单独一幕 dialogue），或插入外部事件拆局；仍须服从人设与因果。'
    );
  }
  return chunks.join('\n');
}
