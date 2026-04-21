import type { ParseResult, Session, StateChanges, ProcessResult } from '../types';
import { callLLM } from './llm-adapter';
import { buildPrompt } from './prompt-builder';
import { updateMemory } from './memory-manager';
import { parseResponse, validateParse } from './response-parser';
import { LLMTransportError, ParseResponseError } from '../errors';
import { logEngine } from './logger';

const PARSE_RETRY_HINT =
  '\n\n【修正要求】请仅输出一个 JSON 对象（不要用 Markdown 代码块）。' +
  'stateChanges 必须是对象（不要用数组包裹），且 hp、relationship 必须是「增量」：应用后玩家 HP 须在 0～当前上限之间，关系须在 -100～100 之间。' +
  '字段：narration（string）、dialogue（string）、stateChanges（{ hp, relationship, reason? }）。';

function buildMemorySlice(session: Session) {
  return {
    recentSummaryLines: session.recentSummaryLines,
    recentPhrases: Array.isArray(session.recentPhrases) ? session.recentPhrases : [],
    keyEvents: session.keyEvents,
    cumulativeState: session.cumulativeState,
  };
}

function assertApplicableState(session: Session, changes: StateChanges): void {
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
  session.player.hp += changes.hp;
  session.npcs.current.relationship += changes.relationship;
  session.relationships[session.npcs.current.id] = session.npcs.current.relationship;
}

async function obtainParsedResult(session: Session, prompt: string): Promise<ParseResult> {
  const attempt = async (suffix: string): Promise<ParseResult> => {
    const raw = await callLLM(prompt + suffix);
    const parsed = parseResponse(raw);
    if (!validateParse(parsed)) {
      throw new ParseResponseError('结构校验未通过');
    }
    assertApplicableState(session, parsed.stateChanges);
    return parsed;
  };
  try {
    return await attempt('');
  } catch (e) {
    // 传输层错误（超时/网络）直接上抛，由上层映射为 LLM_TIMEOUT。
    if (e instanceof LLMTransportError) {
      throw e;
    }
    logEngine('warn', '4-parse', '解析或边界校验失败，重试 LLM 一次', e);
    try {
      return await attempt(PARSE_RETRY_HINT);
    } catch (e2) {
      if (e2 instanceof LLMTransportError) {
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
    logEngine('info', '1-memory', '加载会话记忆中的滚动摘要与关键事件');
    const memory = buildMemorySlice(session);

    logEngine('info', '2-prompt', '构建 prompt');
    const prompt = buildPrompt(session.npcs, memory, intent, session.scenarioId);

    logEngine('info', '3-llm', '调用 LLM');
    const parsed = await obtainParsedResult(session, prompt);

    logEngine('info', '4-parse', '解析与校验完成');

    logEngine('info', '5-state', '应用状态变化');
    applyStateChanges(session, parsed.stateChanges);

    logEngine('info', '6-memory', '更新滚动摘要与关键事件');
    updateMemory(session, intent, parsed, parsed.stateChanges);

    logEngine('info', '7-return', '返回叙事结果');
    return {
      narration: parsed.narration,
      dialogue: parsed.dialogue,
      changes: parsed.stateChanges,
      state: session,
    };
  } catch (e) {
    logEngine('error', 'process', '处理失败', e);
    throw e;
  }
}
