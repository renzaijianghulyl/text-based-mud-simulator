/**
 * 微信云函数入口：单轮互动（OPENID 作为 userId，不信赖客户端传 userId）。
 */
import * as cloud from 'wx-server-sdk';
import { process } from '../../engine/engine';
import { OPENING_ROUND_INTENT } from '../../engine/opening-intent';
import * as cloudSession from '../../adapters/wechat/cloud-session-store';
import {
  ChibiNpcRegistryError,
  XuanwuMenNpcRegistryError,
  ShangYangBianFaNpcRegistryError,
  CloudDatabaseError,
  LLMConfigError,
  LLMTransportError,
  ParseResponseError,
  ScenarioUnsupportedError,
  SessionNotFoundError,
} from '../../errors';
import type { PlayerRoleProfile, Session } from '../../types';
import { ensureNpcCombatFields } from '../../engine/npc-combat';
import {
  ensureEliminatedNpcFields,
  ensureIntentQuotaFields,
  intentQuotaRemaining,
  INTENT_QUOTA_PER_SHARE,
  MAX_INTENT_SHARE_CLAIMS_PER_SESSION,
} from '../../sessions/intent-quota';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

export interface InteractEvent {
  scenarioId?: string;
  intent?: string;
  /** 为 true 时删除旧会话并新建（不要求 intent） */
  isNew?: boolean;
  /** 与 checkSessionOnly 二选一语义：只读查询是否存在会话 */
  action?: string;
  /** 为 true 时只返回 exists，不跑 LLM、不写库 */
  checkSessionOnly?: boolean;
  /** 新开局时可传入玩家身份（原创角色 / 扮演武将） */
  playerRoleProfile?: PlayerRoleProfile;
}

function serializeStateForClient(session: Session) {
  ensureIntentQuotaFields(session);
  ensureEliminatedNpcFields(session);
  ensureNpcCombatFields(session);
  return {
    player: session.player,
    playerRoleProfile: session.playerRoleProfile,
    npcs: session.npcs,
    relationships: session.relationships,
    currentRound: session.currentRound,
    scenarioId: session.scenarioId,
    cumulativeState: session.cumulativeState,
    intentQuotaGranted: session.intentQuotaGranted,
    intentQuotaConsumed: session.intentQuotaConsumed,
    intentQuotaRemaining: intentQuotaRemaining(session),
    eliminatedNpcIds: session.eliminatedNpcIds,
    npcCombatById: session.npcCombatById,
  };
}

function sanitizePlayerRoleProfile(input: unknown): PlayerRoleProfile | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const profile = input as Record<string, unknown>;
  const mode = typeof profile.mode === 'string' ? profile.mode : '';
  if (mode === 'oc') {
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const background = typeof profile.background === 'string' ? profile.background.trim() : '';
    if (!name || !background) return undefined;
    return { mode: 'oc', name, background };
  }
  if (mode === 'general') {
    const generalName = typeof profile.generalName === 'string' ? profile.generalName.trim() : '';
    if (!generalName) return undefined;
    return { mode: 'general', generalName };
  }
  return undefined;
}

/** 拼接 message 与 cause 链，便于区分超时与 HTTP/模型错误（外层常为「主备均失败」）。 */
function flattenErrorMessages(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur instanceof Error && !seen.has(cur)) {
    seen.add(cur);
    parts.push(cur.message);
    cur = (cur as Error & { cause?: unknown }).cause;
  }
  if (cur !== undefined && !(cur instanceof Error)) {
    parts.push(String(cur));
  }
  return parts.join(' ');
}

function mapLlmTransportError(err: LLMTransportError): { success: false; code: string; message: string } {
  const text = flattenErrorMessages(err).toLowerCase();
  const timeoutLike =
    text.includes('aborted') ||
    text.includes('aborterror') ||
    text.includes('timeout') ||
    text.includes('etimedout') ||
    text.includes('econnreset') ||
    text.includes('socket hang up') ||
    /\bhttp 408\b/.test(text) ||
    /\bhttp 504\b/.test(text);
  if (timeoutLike) {
    return { success: false, code: 'LLM_TIMEOUT', message: '响应超时，请重试' };
  }
  return { success: false, code: 'LLM_UPSTREAM', message: '生成暂时不可用，请稍后再试' };
}

function mapError(err: unknown): { success: false; code: string; message: string } {
  if (err instanceof SessionNotFoundError) {
    return { success: false, code: 'SESSION_EXPIRED', message: err.message };
  }
  if (err instanceof ParseResponseError) {
    const msg = err.message;
    if (msg.includes('意图不能为空')) {
      return { success: false, code: 'EMPTY_INTENT', message: '请输入你的行动或对话' };
    }
    return { success: false, code: 'PARSE_FAILED', message: '生成失败，请重试' };
  }
  if (err instanceof LLMConfigError) {
    return { success: false, code: 'LLM_CONFIG', message: '服务未就绪，请稍后再试' };
  }
  if (err instanceof LLMTransportError) {
    return mapLlmTransportError(err);
  }
  if (err instanceof CloudDatabaseError) {
    return { success: false, code: 'DB_ERROR', message: '网络异常，请稍后重试' };
  }
  if (err instanceof ScenarioUnsupportedError) {
    console.error('[interact] ScenarioUnsupportedError', err.scenarioId, err.message);
    return {
      success: false,
      code: 'SCENARIO_UNSUPPORTED',
      message: '该剧本暂时无法开局，请稍后再试或更新云端版本。',
    };
  }
  if (err instanceof ChibiNpcRegistryError) {
    console.error('[interact] ChibiNpcRegistryError', err.message);
    return {
      success: false,
      code: 'CHIBI_REGISTRY_MISSING',
      message: '赤壁剧本数据未就绪，请稍后再试或联系管理员。',
    };
  }
  if (err instanceof XuanwuMenNpcRegistryError) {
    console.error('[interact] XuanwuMenNpcRegistryError', err.message);
    return {
      success: false,
      code: 'XUANWU_MEN_REGISTRY_MISSING',
      message: '玄武门剧本数据未就绪，请稍后再试或联系管理员。',
    };
  }
  if (err instanceof ShangYangBianFaNpcRegistryError) {
    console.error('[interact] ShangYangBianFaNpcRegistryError', err.message);
    return {
      success: false,
      code: 'SHANG_YANG_BIAN_FA_REGISTRY_MISSING',
      message: '商鞅变法剧本数据未就绪，请稍后再试或联系管理员。',
    };
  }
  console.error('[interact] unmapped error', err instanceof Error ? err.name : typeof err, flattenErrorMessages(err));
  return { success: false, code: 'UNKNOWN', message: '生成失败，请重试' };
}

export async function main(
  event: InteractEvent,
  _context: unknown
): Promise<Record<string, unknown>> {
  void _context;
  const wx = cloud.getWXContext();
  const OPENID = wx.OPENID;
  if (!OPENID) {
    return { success: false, code: 'UNAUTH', message: '请重新进入小程序后再试' };
  }

  const scenarioId = typeof event.scenarioId === 'string' && event.scenarioId ? event.scenarioId : 'hulaguan';
  const intent = typeof event.intent === 'string' ? event.intent : '';
  const isNew = Boolean(event.isNew);
  const checkSessionOnly = Boolean(event.checkSessionOnly) || event.action === 'sessionExists';
  const playerRoleProfile = sanitizePlayerRoleProfile(event.playerRoleProfile);

  try {
    if (checkSessionOnly) {
      const exists = await cloudSession.sessionExists(OPENID, scenarioId);
      return { success: true, code: 'OK', exists };
    }

    if (event.action === 'getStateOnly') {
      const session = await cloudSession.loadSession(OPENID, scenarioId);
      return {
        success: true,
        code: 'OK',
        state: serializeStateForClient(session),
      };
    }

    if (event.action === 'intentShareBonus') {
      const session = await cloudSession.loadSession(OPENID, scenarioId);
      ensureIntentQuotaFields(session);
      ensureEliminatedNpcFields(session);
      ensureNpcCombatFields(session);
      if (session.intentQuotaShareClaims >= MAX_INTENT_SHARE_CLAIMS_PER_SESSION) {
        return {
          success: false,
          code: 'SHARE_LIMIT',
          message: '本局分享领取次数已达上限',
          state: serializeStateForClient(session),
        };
      }
      session.intentQuotaGranted += INTENT_QUOTA_PER_SHARE;
      session.intentQuotaShareClaims += 1;
      session.updatedAt = new Date();
      await cloudSession.saveSession(session);
      return {
        success: true,
        code: 'OK',
        message: '已增加意图次数',
        state: serializeStateForClient(session),
      };
    }

    if (isNew) {
      // 新开剧本语义：无条件重置会话（删除旧档 -> 按当前参数新建），不复用旧状态。
      await cloudSession.deleteSession(OPENID, scenarioId).catch(() => undefined);
      const session = cloudSession.buildDemoSession(OPENID, scenarioId, undefined, playerRoleProfile);
      await cloudSession.saveSession(session);
      try {
        const loaded = await cloudSession.loadSession(OPENID, scenarioId);
        const result = await process(loaded, OPENING_ROUND_INTENT);
        await cloudSession.saveSession(result.state);
        return {
          success: true,
          code: 'OK',
          message: '已新开剧本',
          narration: result.narration,
          dialogue: result.dialogue,
          scenes: result.scenes ?? [],
          changes: result.changes,
          state: serializeStateForClient(result.state),
        };
      } catch (e) {
        let fallback: Session;
        try {
          fallback = await cloudSession.loadSession(OPENID, scenarioId);
        } catch {
          fallback = session;
        }
        const err = mapError(e);
        return {
          ...err,
          state: serializeStateForClient(fallback),
          narration: '',
          dialogue: '',
          scenes: [],
          changes: { hp: 0, relationship: 0 },
        };
      }
    }

    if (!intent.trim()) {
      return mapError(new ParseResponseError('意图不能为空'));
    }

    const session = await cloudSession.loadSession(OPENID, scenarioId);
    ensureIntentQuotaFields(session);
    ensureEliminatedNpcFields(session);
    ensureNpcCombatFields(session);
    if (intentQuotaRemaining(session) <= 0) {
      return {
        success: false,
        code: 'QUOTA_EXCEEDED',
        message: '本轮意图次数已用尽，请先分享获取更多次数',
        state: serializeStateForClient(session),
      };
    }
    const result = await process(session, intent);
    result.state.intentQuotaConsumed += 1;
    await cloudSession.saveSession(result.state);
    return {
      success: true,
      code: 'OK',
      message: '',
      narration: result.narration,
      dialogue: result.dialogue,
      scenes: result.scenes ?? [],
      changes: result.changes,
      state: serializeStateForClient(result.state),
    };
  } catch (e) {
    return mapError(e);
  }
}
