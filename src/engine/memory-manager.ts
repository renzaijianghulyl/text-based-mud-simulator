import type { NarrativeEnvironment, ParseResult, RecentPhrase, Session, StateChanges } from '../types';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';
import {
  formatEliminatedNpcLabels,
  inferEliminatedNpcIdsFromScenes,
  mergeEliminatedNpcIds,
} from './eliminated-npcs';

const SPECIAL_KEYWORDS = [
  '投降',
  '逃跑',
  '刺杀',
  '结盟',
  '展示奇物',
  '家世',
  '身世',
  '家族',
  '旧怨',
  '师门',
  '归顺',
] as const;
const RECENT_WINDOW_SIZE = 3;
const TRACKED_PHRASES = [
  '旌旗猎猎',
  '旌旗翻滚',
  '旌旗飘扬',
  '目光如电',
  '目光如炬',
  '双眸生寒',
  '冷哼',
  '冷笑',
  '嗤笑',
  '画戟',
  '杀气',
] as const;

/** 新会话初始环境锚点（供 buildDemoSession 等使用） */
export function defaultEnvironmentForScenario(scenarioId: string): NarrativeEnvironment {
  if (scenarioId === 'hulaguan') {
    return {
      time: '清晨',
      weather: '风沙微起',
      location: '虎牢关前营帐',
    };
  }
  if (scenarioId === 'chibi') {
    return {
      time: '黄昏',
      weather: '江雾渐起',
      location: '赤壁南岸水寨栈桥',
    };
  }
  if (scenarioId === 'xuanwu-men') {
    return {
      time: '拂晓',
      weather: '闷湿欲雨',
      location: '长安宫城北阙玄武门一带',
    };
  }
  if (scenarioId === 'shang-yang-bian-fa') {
    return {
      time: '午后',
      weather: '燥热微尘',
      location: '秦宫府廊庑与朝堂阶下',
    };
  }
  return {
    time: '白日',
    weather: '平稳',
    location: '当前场景',
  };
}

function inferEnvironment(
  base: NarrativeEnvironment,
  text: string,
  scenarioId?: string
): NarrativeEnvironment {
  let time = base.time;
  let weather = base.weather;
  let location = base.location;

  if (/(夜色|夜幕|月色|星光|深夜|夜晚)/.test(text)) time = '夜晚';
  else if (/(黄昏|暮色|夕阳|残阳|薄暮)/.test(text)) time = '黄昏';
  else if (/(正午|午后|烈日|日头高照)/.test(text)) time = '正午';
  else if (/(清晨|拂晓|晨光|天刚亮)/.test(text)) time = '清晨';

  if (/(暴雨|大雨|雨幕|雨点)/.test(text)) weather = '雨势渐起';
  else if (/(雪|霜|寒风刺骨|风雪)/.test(text)) weather = '寒风带雪';
  else if (/(雾|迷雾|烟尘|雾气)/.test(text)) weather = '雾气弥漫';
  else if (/(风沙|沙尘|尘土飞扬)/.test(text)) weather = '风沙弥漫';
  else if (/(浪|江风|东南风|逆风)/.test(text)) weather = '江风渐紧';
  else if (/(晴朗|天朗|云开|日光)/.test(text)) weather = '天色转晴';

  if (scenarioId === 'chibi') {
    if (/(江北|乌林|连营)/.test(text)) location = '江北连营一带';
    else if (/(江面|战船|楼船|蒙冲|舟师)/.test(text)) location = '赤壁江面';
    else if (/(水寨|栈桥|南岸)/.test(text)) location = '南岸水寨';
    else if (/(营帐|帐内|帐外|军帐|中军)/.test(text)) location = '南岸水寨中军';
    else if (/(荒野|野外|林间|山道)/.test(text)) location = '江岸野地';
  } else if (scenarioId === 'xuanwu-men') {
    if (/(太极殿|内廷|内谒|辇|辇道)/.test(text)) location = '太极宫一带';
    else if (/(秦王府)/.test(text)) location = '秦王府';
    else if (/(东宫|太子卫|卫率)/.test(text)) location = '东宫侧近';
    else if (/(玄武门|宫门|门阙|阙下|禁苑|掖庭|更鼓|甲叶)/.test(text)) location = '宫门与禁苑侧';
    else if (/(营帐|帐内|帐外|军帐|中军|宿卫)/.test(text)) location = '禁军营帐';
    else if (/(荒野|野外|林间|山道)/.test(text)) location = '长安郭外';
  } else if (scenarioId === 'shang-yang-bian-fa') {
    if (/(朝堂|廷辩|阶陛|大殿)/.test(text)) location = '咸阳或栎阳朝堂一带';
    else if (/(市肆|徙木|立木|木表)/.test(text)) location = '市肆立木处';
    else if (/(廊庑|宫府|谒者|牍)/.test(text)) location = '宫府廊庑';
    else if (/(东宫|太子|傅)/.test(text)) location = '东宫侧近';
    else if (/(营帐|帐内|帐外|军帐)/.test(text)) location = '宿卫营帐';
    else if (/(荒野|野外|林间|山道)/.test(text)) location = '关外野地';
  } else {
    if (/(营帐|帐内|帐外|军帐)/.test(text)) location = '虎牢关前营帐';
    else if (/(关前|城门|关隘|虎牢关前)/.test(text)) location = '虎牢关前';
    else if (/(城楼|城墙|关城)/.test(text)) location = '虎牢关城楼';
    else if (/(荒野|野外|林间|山道)/.test(text)) location = '关外野地';
  }

  return { time, weather, location };
}

function extractRecentPhrases(text: string, round: number): RecentPhrase[] {
  const found = TRACKED_PHRASES.filter((phrase) => text.includes(phrase)).slice(0, 3);
  return found.map((phrase) => ({ phrase, round }));
}

function getImpactDescription(changes: StateChanges): string {
  const parts: string[] = [];
  if (changes.hp !== 0) parts.push(`HP 变化 ${changes.hp}`);
  if (changes.relationship !== 0) parts.push(`关系变化 ${changes.relationship}`);
  if (changes.reason) parts.push(changes.reason);
  if (changes.eliminatedNpcs && changes.eliminatedNpcs.length > 0) {
    parts.push(`退场 id：${changes.eliminatedNpcs.join('、')}`);
  }
  if (changes.npcHp && changes.npcHp.length > 0) {
    parts.push(
      `卡司 HP：${changes.npcHp.map((e) => `${e.id}${e.delta >= 0 ? '+' : ''}${e.delta}`).join('；')}`
    );
  }
  return parts.length > 0 ? parts.join('；') : '关键状态波动';
}

/**
 * 是否记为关键事件：关系变化幅度 >50、HP 损失 >30、或意图含特殊行为词。
 * intent 用于关键词检测（与 .cursorrules 一致）。
 */
export function isKeyEvent(changes: StateChanges, intent: string): boolean {
  if (changes.npcHp?.some((e) => Math.abs(e.delta) >= 20)) return true;
  if (changes.eliminatedNpcs && changes.eliminatedNpcs.length > 0) return true;
  if (Math.abs(changes.relationship) > 50) return true;
  if (changes.hp < -30) return true;
  if (changes.hp > 30) return true;
  return SPECIAL_KEYWORDS.some((k) => intent.includes(k));
}

/**
 * 更新滚动摘要（保留最近 3 条）、关键事件列表、累计状态中的 HP 与总轮次。
 */
export function updateMemory(
  session: Session,
  intent: string,
  response: ParseResult,
  changes: StateChanges
): void {
  ensureEliminatedNpcFields(session);
  const eliminatedBefore = [...session.eliminatedNpcIds!];

  const snippet = intent.trim().slice(0, 40);
  const summary = `R${session.currentRound}: ${snippet}${intent.length > 40 ? '…' : ''}`;
  session.recentSummaryLines.push(summary);
  if (session.recentSummaryLines.length > 3) {
    session.recentSummaryLines.shift();
  }

  if (isKeyEvent(changes, intent)) {
    session.keyEvents.push({
      round: session.currentRound,
      event: intent,
      impact: getImpactDescription(changes),
    });
  }

  session.cumulativeState.totalRounds += 1;
  session.cumulativeState.hp = session.player.hp;
  session.cumulativeState.maxHp = session.player.maxHp;
  const defaultEnv = defaultEnvironmentForScenario(session.scenarioId);
  const currentEnv = session.cumulativeState.environment ?? defaultEnv;
  const sceneText = `${intent}\n${response.narration}\n${response.dialogue}`;
  session.cumulativeState.environment = inferEnvironment(currentEnv, sceneText, session.scenarioId);

  const phraseCandidates = extractRecentPhrases(sceneText, session.currentRound);
  if (!Array.isArray(session.recentPhrases)) {
    session.recentPhrases = [];
  }
  for (const candidate of phraseCandidates) {
    const sameIdx = session.recentPhrases.findIndex((p) => p.phrase === candidate.phrase);
    if (sameIdx >= 0) {
      session.recentPhrases[sameIdx] = candidate;
      continue;
    }
    session.recentPhrases.push(candidate);
  }
  session.recentPhrases = session.recentPhrases
    .sort((a, b) => b.round - a.round)
    .slice(0, RECENT_WINDOW_SIZE);

  mergeEliminatedNpcIds(session, inferEliminatedNpcIdsFromScenes(session, response.scenes));
  const newlyEliminated = session.eliminatedNpcIds!.filter((id) => !eliminatedBefore.includes(id));
  if (newlyEliminated.length > 0) {
    const label = formatEliminatedNpcLabels(session.scenarioId, newlyEliminated);
    session.keyEvents.push({
      round: session.currentRound,
      event: intent,
      impact: `叙事：${label} 阵亡/退场（归纳）`,
    });
  }

  session.history.push({
    round: session.currentRound,
    intent,
    narration: response.narration,
    dialogue: response.dialogue,
    changes: { ...changes },
    timestamp: new Date().toISOString(),
  });

  session.currentRound += 1;
  session.updatedAt = new Date();
}
