/**
 * 微信云开发数据库版会话存储（仅云函数运行时加载 wx-server-sdk）。
 */
import * as wxCloud from 'wx-server-sdk';
import type { Session } from '../types';
import { CloudDatabaseError, SessionNotFoundError } from '../errors';
import { buildDemoSessionFromNpc, sessionKey } from './build-demo-session';
import { getHulaguanNpcTemplate } from './hulaguan-npc-static';

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

/** MVP：仅 hulaguan；NPC 来自静态模板。 */
export function buildDemoSession(userId: string, scenarioId: string, targetNpcId?: string): Session {
  if (scenarioId !== 'hulaguan') {
    throw new Error('MVP 仅支持剧本 hulaguan');
  }
  const npc = getHulaguanNpcTemplate(targetNpcId);
  return buildDemoSessionFromNpc(userId, scenarioId, npc);
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
    return fromPlain(res.data[0] as Record<string, unknown>);
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
