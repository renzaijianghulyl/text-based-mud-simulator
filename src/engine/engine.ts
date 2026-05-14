import type { ParseResult, Session, StateChanges, ProcessResult } from '../types';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';
import { callLLM } from './llm-adapter';
import { buildPrompt, type PromptProfile } from './prompt-builder';
import { mergeEliminatedNpcIds } from './eliminated-npcs';
import {
  applyNpcHpDeltas,
  assertNpcHpDeltasApplicable,
  ensureNpcCombatFields,
} from './npc-combat';
import { updateMemory } from './memory-manager';
import { collectAddressWarnings, collectHistoricalWarnings } from './historical-context';
import { parseResponse, validateParse } from './response-parser';
import { assertDialogueSpeakersAllowed } from './npc-dialogue-speaker-policy';
import { LLMConfigError, LLMTransportError, ParseResponseError } from '../errors';
import { beginTimer, logEngine, logLatencySummary, recordLatency } from './logger';
import { PROMPT_PROFILE_RULES, type PromptProfileContext } from './prompt-profile-rules';
import { isOpeningRoundIntent } from './opening-intent';

const PARSE_RETRY_HINT =
  '\n\n【结构修复要求】请只修复输出结构，不要重写剧情风格。' +
  '仅输出一个 JSON 对象（不要 Markdown 代码块）。' +
  'scenes 必须是非空数组（每项含 type/content，dialogue 幕必须带 speaker）；' +
  'stateChanges 必须是对象（不要数组），hp、relationship 必须是增量；字段为 scenes、stateChanges；' +
  '可选 eliminatedNpcs：字符串数组，每项为剧本 npc id（如 hua-xiong），仅当本局确有卡司退场时填写。' +
  '可选 npcHp：对象数组，每项 { id, delta }，id 为剧本 npc id，delta 为相对本会话副本的 HP 增量；仅当本轮叙事确有卡司伤血/治疗等时填写。';

function buildMemorySlice(session: Session) {
  ensureEliminatedNpcFields(session);
  ensureNpcCombatFields(session);
  return {
    recentSummaryLines: session.recentSummaryLines,
    recentPhrases: Array.isArray(session.recentPhrases) ? session.recentPhrases : [],
    keyEvents: session.keyEvents,
    cumulativeState: session.cumulativeState,
    eliminatedNpcIds: session.eliminatedNpcIds!,
    npcCombatById: session.npcCombatById!,
  };
}

function assertApplicableState(session: Session, changes: StateChanges): void {
  ensureNpcCombatFields(session);
  assertNpcHpDeltasApplicable(session, changes);
  const nextHp = session.player.hp + changes.hp;
  if (!Number.isFinite(nextHp) || nextHp < 0 || nextHp > session.player.maxHp) {
    throw new ParseResponseError('状态变化导致 HP 越界，请重试或调整叙事');
  }
  const nextRel = session.npcs.current.relationship + changes.relationship;
  if (!Number.isFinite(nextRel) || nextRel < -100 || nextRel > 100) {
    throw new ParseResponseError('状态变化导致关系越界，请重试或调整叙事');
  }
}

function applyStateChanges(session: Session, changes: StateChanges): void {
  ensureEliminatedNpcFields(session);
  ensureNpcCombatFields(session);
  session.player.hp += changes.hp;
  session.npcs.current.relationship += changes.relationship;
  session.relationships[session.npcs.current.id] = session.npcs.current.relationship;
  mergeEliminatedNpcIds(session, changes.eliminatedNpcs);
  applyNpcHpDeltas(session, changes);
}

function resolvePromptProfileByEnv(intent: string, context: PromptProfileContext): Exclude<PromptProfile, 'auto'> {
  const manual = globalThis.process?.env?.PROMPT_PROFILE?.trim().toLowerCase();
  if (manual === 'fast' || manual === 'balanced' || manual === 'rich') {
    return manual;
  }
  if (manual !== 'auto') {
    return 'balanced';
  }
  return resolvePromptProfile(intent, context);
}

export function resolvePromptProfile(
  intent: string,
  context: PromptProfileContext
): Exclude<PromptProfile, 'auto'> {
  const normalized = intent.toLowerCase().trim();
  const richRules = PROMPT_PROFILE_RULES.rich;
  const matchedHard = richRules.hardKeywords.find((kw) => normalized.includes(kw));
  if (matchedHard) {
    logEngine('info', 'profile', `matchedHard:${matchedHard}`);
    return 'rich';
  }
  const softScore = richRules.softKeywords.filter((kw) => normalized.includes(kw)).length;
  if (softScore >= richRules.minSoftScore) {
    logEngine('info', 'profile', `softScore:${softScore}`);
    return 'rich';
  }
  if (
    softScore >= 1 &&
    normalized.length >= richRules.minIntentLength &&
    context.relationship >= richRules.minRelationship &&
    context.round >= richRules.minRound
  ) {
    logEngine(
      'info',
      'profile',
      `softWithContext score=${softScore} rel=${context.relationship} round=${context.round}`
    );
    return 'rich';
  }
  const fastRules = PROMPT_PROFILE_RULES.fast;
  const denyFast = PROMPT_PROFILE_RULES.riskDenyFastKeywords.find((kw) => normalized.includes(kw));
  if (denyFast) {
    logEngine('info', 'profile', `denyFast:${denyFast}`);
    return PROMPT_PROFILE_RULES.defaultProfile;
  }
  if (
    normalized.length <= fastRules.maxIntentLength ||
    fastRules.keywords.some((kw) => normalized.includes(kw))
  ) {
    logEngine('info', 'profile', `fastRule len=${normalized.length}`);
    return 'fast';
  }
  return PROMPT_PROFILE_RULES.defaultProfile;
}

async function obtainParsedResult(session: Session, prompt: string): Promise<ParseResult> {
  const attempt = async (requestPrompt: string): Promise<{ parsed: ParseResult; raw: string }> => {
    const llmStart = beginTimer();
    const raw = await callLLM(requestPrompt);
    const llmMs = recordLatency('llm-call', llmStart);
    logEngine('info', '3-llm', `LLM 返回，耗时 ${llmMs}ms`);
    logLatencySummary('llm-call');
    const parseStart = beginTimer();
    const parsed = parseResponse(raw);
    const parseMs = recordLatency('parse-response', parseStart);
    logEngine('info', '4-parse', `解析完成，耗时 ${parseMs}ms`);
    logLatencySummary('parse-response');
    if (!validateParse(parsed)) {
      throw new ParseResponseError('结构校验未通过');
    }
    assertDialogueSpeakersAllowed(session.scenarioId, parsed);
    const historicalHits = collectHistoricalWarnings(session.scenarioId, parsed);
    const addressHits = collectAddressWarnings(
      session.scenarioId,
      session.npcs.current.id,
      session.npcs.current.name,
      parsed
    );
    const allHistoricalHits = [...historicalHits, ...addressHits];
    if (allHistoricalHits.length > 0) {
      logEngine('warn', '4-parse', `历史一致性提示：${allHistoricalHits.join('；')}`);
    }
    assertApplicableState(session, parsed.stateChanges);
    return { parsed, raw };
  };
  try {
    const first = await attempt(prompt);
    return first.parsed;
  } catch (e) {
    // 传输层错误（超时/网络）直接上抛，由上层映射为 LLM_TIMEOUT。
    if (e instanceof LLMTransportError) {
      throw e;
    }
    // 密钥/路由未配置：重试无意义，直接上抛，由云函数映射为 LLM_CONFIG。
    if (e instanceof LLMConfigError) {
      throw e;
    }
    logEngine('warn', '4-parse', '解析或边界校验失败，重试 LLM 一次', e);
    try {
      const causeText =
        e && typeof e === 'object' && 'cause' in e && (e as { cause?: unknown }).cause
          ? String((e as { cause?: unknown }).cause)
          : String(e);
      const repairPrompt =
        `${prompt}\n${PARSE_RETRY_HINT}\n` +
        `请重点修复 JSON 结构，保持叙事语气。\n` +
        `上一版报错线索：${causeText.slice(0, 600)}`;
      const second = await attempt(repairPrompt);
      return second.parsed;
    } catch (e2) {
      if (e2 instanceof LLMTransportError) {
        throw e2;
      }
      if (e2 instanceof LLMConfigError) {
        throw e2;
      }
      throw new ParseResponseError('生成失败，请重试', { cause: e2 });
    }
  }
}

/**
 * 剧本引擎单轮处理：加载记忆 → 构建 prompt → 调用 LLM → 解析 → 更新状态 → 更新记忆 → 返回。
 */
export async function process(session: Session, intent: string): Promise<ProcessResult> {
  if (!intent.trim()) {
    throw new ParseResponseError('意图不能为空');
  }

  try {
    const roundStart = beginTimer();
    logEngine('info', '1-memory', '加载会话记忆中的滚动摘要与关键事件');
    const memory = buildMemorySlice(session);
    let selectedProfile = resolvePromptProfileByEnv(intent, {
      relationship: session.npcs.current.relationship,
      round: session.currentRound,
    });
    if (isOpeningRoundIntent(intent)) {
      selectedProfile = 'fast';
      logEngine('info', 'profile', 'opening-round -> fast');
    }
    logEngine('info', 'profile', `本轮 promptProfile=${selectedProfile}`);

    logEngine('info', '2-prompt', '构建 prompt');
    const promptStart = beginTimer();
    const prompt = buildPrompt(
      session.npcs,
      memory,
      intent,
      session.scenarioId,
      selectedProfile,
      session.playerRoleProfile
    );
    const promptMs = recordLatency('build-prompt', promptStart);
    logEngine('info', '2-prompt', `构建完成，长度 ${prompt.length} 字符，耗时 ${promptMs}ms`);
    logLatencySummary('build-prompt');

    logEngine('info', '3-llm', '调用 LLM');
    const parsed = await obtainParsedResult(session, prompt);

    logEngine('info', '4-parse', '解析与校验完成');

    logEngine('info', '5-state', '应用状态变化');
    applyStateChanges(session, parsed.stateChanges);

    logEngine('info', '6-memory', '更新滚动摘要与关键事件');
    updateMemory(session, intent, parsed, parsed.stateChanges);

    logEngine('info', '7-return', '返回叙事结果');
    const totalMs = recordLatency('process-total', roundStart);
    logEngine('info', 'process', `单轮总耗时 ${totalMs}ms`);
    logLatencySummary('process-total');
    return {
      narration: parsed.narration,
      dialogue: parsed.dialogue,
      changes: parsed.stateChanges,
      scenes: parsed.scenes,
      state: session,
    };
  } catch (e) {
    logEngine('error', 'process', '处理失败', e);
    throw e;
  }
}
