/**
 * 微信云函数入口：单轮互动（OPENID 作为 userId，不信赖客户端传 userId）。
 */
import * as cloud from 'wx-server-sdk';
import { process } from '../../engine/engine';
import * as cloudSession from '../../sessions/cloud-session-store';
import {
  CloudDatabaseError,
  LLMTransportError,
  ParseResponseError,
  SessionNotFoundError,
} from '../../errors';
import type { Session } from '../../types';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

export interface InteractEvent {
  scenarioId?: string;
  intent?: string;
  /** 为 true 时删除旧会话并新建（不要求 intent） */
  isNew?: boolean;
}

function serializeStateForClient(session: Session) {
  return {
    player: session.player,
    npcs: session.npcs,
    relationships: session.relationships,
    currentRound: session.currentRound,
    scenarioId: session.scenarioId,
    cumulativeState: session.cumulativeState,
  };
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
  if (err instanceof LLMTransportError) {
    return { success: false, code: 'LLM_TIMEOUT', message: '响应超时，请重试' };
  }
  if (err instanceof CloudDatabaseError) {
    return { success: false, code: 'DB_ERROR', message: '网络异常，请稍后重试' };
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

  try {
    if (isNew) {
      await cloudSession.deleteSession(OPENID, scenarioId).catch(() => undefined);
      const session = cloudSession.buildDemoSession(OPENID, scenarioId);
      await cloudSession.saveSession(session);
      return {
        success: true,
        code: 'OK',
        message: '已新开剧本',
        narration: '',
        dialogue: '',
        changes: { hp: 0, relationship: 0 },
        state: serializeStateForClient(session),
      };
    }

    if (!intent.trim()) {
      return mapError(new ParseResponseError('意图不能为空'));
    }

    const session = await cloudSession.loadSession(OPENID, scenarioId);
    const result = await process(session, intent);
    await cloudSession.saveSession(result.state);
    return {
      success: true,
      code: 'OK',
      message: '',
      narration: result.narration,
      dialogue: result.dialogue,
      changes: result.changes,
      state: serializeStateForClient(result.state),
    };
  } catch (e) {
    return mapError(e);
  }
}
