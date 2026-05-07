/**
 * 微信云函数入口：单轮互动（OPENID 作为 userId，不信赖客户端传 userId）。
 */
import * as cloud from 'wx-server-sdk';
import { process } from '../../engine/engine';
import { OPENING_ROUND_INTENT } from '../../engine/opening-intent';
import * as cloudSession from '../../adapters/wechat/cloud-session-store';
import {
  CloudDatabaseError,
  ContentCheckUnavailableError,
  ContentRiskError,
  LLMConfigError,
  LLMTransportError,
  ParseResponseError,
  SessionNotFoundError,
} from '../../errors';
import type { PlayerRoleProfile, Session } from '../../types';
import {
  ensureIntentQuotaFields,
  intentQuotaRemaining,
  INTENT_QUOTA_PER_SHARE,
  MAX_INTENT_SHARE_CLAIMS_PER_SESSION,
} from '../../sessions/intent-quota';
import { checkAiOutputText, checkText } from '../../adapters/wechat/wx-content-security';

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
  if (err instanceof ContentRiskError) {
    if (err.kind === 'ai') {
      return { success: false, code: 'CONTENT_RISK_AI', message: '本轮剧情未通过审核，请重新尝试' };
    }
    return { success: false, code: 'CONTENT_RISK_USER', message: '输入包含违规内容，请修改后重试' };
  }
  if (err instanceof ContentCheckUnavailableError) {
    return { success: false, code: 'CONTENT_CHECK_UNAVAILABLE', message: '内容审核暂不可用，请稍后再试' };
  }
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
      // 1. 先审核 OC 玩家身份（姓名 + 背景）；命中违规直接拒绝，不创建会话。
      if (playerRoleProfile?.mode === 'oc') {
        await checkText(`${playerRoleProfile.name}\n${playerRoleProfile.background}`, OPENID, {
          kind: 'user',
        });
      }

      await cloudSession.deleteSession(OPENID, scenarioId).catch(() => undefined);
      const session = cloudSession.buildDemoSession(OPENID, scenarioId, undefined, playerRoleProfile);
      await cloudSession.saveSession(session);
      try {
        const loaded = await cloudSession.loadSession(OPENID, scenarioId);
        const result = await process(loaded, OPENING_ROUND_INTENT);
        // 2. 开局 LLM 输出审核：违规则不保存推进结果，会话保持空开局态。
        await checkAiOutputText(
          { narration: result.narration, dialogue: result.dialogue, scenes: result.scenes },
          OPENID
        );
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

    // 3. 普通轮：UGC（intent）前置审核，不通过不进 LLM、不消耗配额、不写库。
    await checkText(intent, OPENID, { kind: 'user' });

    const session = await cloudSession.loadSession(OPENID, scenarioId);
    ensureIntentQuotaFields(session);
    if (intentQuotaRemaining(session) <= 0) {
      return {
        success: false,
        code: 'QUOTA_EXCEEDED',
        message: '本轮意图次数已用尽，请先分享获取更多次数',
        state: serializeStateForClient(session),
      };
    }
    // 进 LLM 前先把当前状态快照保留，AI 违规时回退给前端，避免 UI 误显示已经发生但未持久化的变化。
    const preProcessSnapshot = serializeStateForClient(session);
    try {
      const result = await process(session, intent);
      // 4. 普通轮：LLM 输出后置审核；违规则不应用状态、不更新记忆、不写库、不消耗配额。
      await checkAiOutputText(
        { narration: result.narration, dialogue: result.dialogue, scenes: result.scenes },
        OPENID
      );
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
      if (e instanceof ContentRiskError || e instanceof ContentCheckUnavailableError) {
        const err = mapError(e);
        return {
          ...err,
          state: preProcessSnapshot,
          narration: '',
          dialogue: '',
          scenes: [],
          changes: { hp: 0, relationship: 0 },
        };
      }
      throw e;
    }
  } catch (e) {
    return mapError(e);
  }
}
