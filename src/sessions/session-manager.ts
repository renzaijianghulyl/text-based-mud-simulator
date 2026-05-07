/**
 * 默认本地文件会话存储：委托给 `FileSessionStore` 单例（目录由 `SESSIONS_DIR` / `SCENARIOS_ROOT` 控制）。
 */
import type { PlayerRoleProfile, Session } from '../types';
import { getDefaultFileSessionStore } from './file-session-store';

export async function loadSession(userId: string, scenarioId: string): Promise<Session> {
  return getDefaultFileSessionStore().loadSession(userId, scenarioId);
}

export async function saveSession(session: Session): Promise<void> {
  return getDefaultFileSessionStore().saveSession(session);
}

export async function deleteSession(userId: string, scenarioId: string): Promise<void> {
  return getDefaultFileSessionStore().deleteSession(userId, scenarioId);
}

export function buildDemoSession(
  userId: string,
  scenarioId: string,
  targetNpcId?: string,
  playerRoleProfile?: PlayerRoleProfile
): Session {
  return getDefaultFileSessionStore().buildDemoSession(userId, scenarioId, targetNpcId, playerRoleProfile);
}

/** 测试或演示用：清空文件存储 */
export function __resetMockSessionsForTest(): void {
  getDefaultFileSessionStore().resetSessionsDirForTest();
}
