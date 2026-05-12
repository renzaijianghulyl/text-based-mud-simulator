/**
 * 微信云开发数据库版会话存储（仅云函数运行时加载 wx-server-sdk）。
 */
import * as wxCloud from 'wx-server-sdk';
import type { PlayerRoleProfile, Session } from '../../types';
import { CloudDatabaseError, ScenarioUnsupportedError, SessionNotFoundError } from '../../errors';
import { buildDemoSessionFromNpc, sessionKey } from '../../sessions/build-demo-session';
import { ensureNpcCombatFields } from '../../engine/npc-combat';
import { ensureEliminatedNpcFields, ensureIntentQuotaFields } from '../../sessions/intent-quota';
import { getChibiNpcTemplate } from '../../sessions/chibi-npc-static';
import { getHulaguanNpcTemplate } from '../../sessions/hulaguan-npc-static';
import { getXuanwuMenNpcTemplate } from '../../sessions/xuanwu-men-npc-static';
import { getShangYangBianFaNpcTemplate } from '../../sessions/shang-yang-bian-fa-npc-static';
import { resolveChibiInitialTargetNpcId } from '../../sessions/chibi-initial-target';
import { resolveHulaguanInitialTargetNpcId } from '../../sessions/hulaguan-initial-target';
import { resolveXuanwuMenInitialTargetNpcId } from '../../sessions/xuanwu-men-initial-target';
import { resolveShangYangBianFaInitialTargetNpcId } from '../../sessions/shang-yang-bian-fa-initial-target';
import type { SessionStore } from '../../sessions/session-store-types';

const COLLECTION = 'sessions';

let inited = false;

function ensureInit(): void {
  if (!inited) {
    wxCloud.init({ env: wxCloud.DYNAMIC_CURRENT_ENV });
    inited = true;
  }
}

function toPlain(session: Session): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(session, (_k, v) => (v instanceof Date ? (v as Date).toISOString() : v))
  ) as Record<string, unknown>;
}

function fromPlain(raw: Record<string, unknown>): Session {
  const s = JSON.parse(JSON.stringify(raw)) as Session;
  s.createdAt = new Date(raw.createdAt as string);
  s.updatedAt = new Date(raw.updatedAt as string);
  return s;
}

/** 云函数新开局：支持 hulaguan、chibi、xuanwu-men、shang-yang-bian-fa；NPC 来自打包进云函数的静态注册表。 */
export function buildDemoSession(
  userId: string,
  scenarioId: string,
  targetNpcId?: string,
  playerRoleProfile?: PlayerRoleProfile
): Session {
  const trimmed = typeof targetNpcId === 'string' && targetNpcId.trim() ? targetNpcId.trim() : '';
  if (scenarioId === 'hulaguan') {
    const requested = trimmed || resolveHulaguanInitialTargetNpcId(playerRoleProfile);
    const npc = getHulaguanNpcTemplate(requested);
    return buildDemoSessionFromNpc(userId, scenarioId, npc, playerRoleProfile);
  }
  if (scenarioId === 'chibi') {
    const requested = trimmed || resolveChibiInitialTargetNpcId(playerRoleProfile);
    const npc = getChibiNpcTemplate(requested);
    return buildDemoSessionFromNpc(userId, scenarioId, npc, playerRoleProfile);
  }
  if (scenarioId === 'xuanwu-men') {
    const requested = trimmed || resolveXuanwuMenInitialTargetNpcId(playerRoleProfile);
    const npc = getXuanwuMenNpcTemplate(requested);
    return buildDemoSessionFromNpc(userId, scenarioId, npc, playerRoleProfile);
  }
  if (scenarioId === 'shang-yang-bian-fa') {
    const requested = trimmed || resolveShangYangBianFaInitialTargetNpcId(playerRoleProfile);
    const npc = getShangYangBianFaNpcTemplate(requested);
    return buildDemoSessionFromNpc(userId, scenarioId, npc, playerRoleProfile);
  }
  throw new ScenarioUnsupportedError(scenarioId);
}

export async function sessionExists(userId: string, scenarioId: string): Promise<boolean> {
  ensureInit();
  const sid = sessionKey(userId, scenarioId);
  const db = wxCloud.database();
  try {
    const res = await db.collection(COLLECTION).where({ sessionId: sid }).limit(1).get();
    return (res.data?.length ?? 0) > 0;
  } catch (e) {
    throw new CloudDatabaseError('sessionExists failed', { cause: e });
  }
}

export async function loadSession(userId: string, scenarioId: string): Promise<Session> {
  ensureInit();
  const sid = sessionKey(userId, scenarioId);
  const db = wxCloud.database();
  try {
    const res = await db.collection(COLLECTION).where({ sessionId: sid }).limit(1).get();
    if (!res.data || res.data.length === 0) {
      throw new SessionNotFoundError(sid);
    }
    const session = fromPlain(res.data[0] as Record<string, unknown>);
    ensureIntentQuotaFields(session);
    ensureEliminatedNpcFields(session);
    ensureNpcCombatFields(session);
    return session;
  } catch (e) {
    if (e instanceof SessionNotFoundError) throw e;
    throw new CloudDatabaseError('loadSession failed', { cause: e });
  }
}

export async function saveSession(session: Session): Promise<void> {
  ensureInit();
  const db = wxCloud.database();
  const plain = { ...toPlain(session) } as Record<string, unknown>;
  const sid = session.sessionId;
  delete plain._id;
  try {
    await db.collection(COLLECTION).doc(sid).set({ data: plain });
  } catch (e) {
    throw new CloudDatabaseError('saveSession failed', { cause: e });
  }
}

export async function deleteSession(userId: string, scenarioId: string): Promise<void> {
  ensureInit();
  const sid = sessionKey(userId, scenarioId);
  const db = wxCloud.database();
  try {
    await db.collection(COLLECTION).doc(sid).remove();
  } catch {
    await db
      .collection(COLLECTION)
      .where({ sessionId: sid })
      .remove()
      .catch(() => undefined);
  }
}

/** 与 `SessionStore` 对齐的适配对象，便于类型化注入或测试替身 */
export const wechatCloudSessionStore: SessionStore = {
  loadSession,
  saveSession,
  deleteSession,
  sessionExists,
  buildDemoSession,
};
