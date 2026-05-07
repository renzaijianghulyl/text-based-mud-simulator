import type { PlayerRoleProfile, Session } from '../types';

/**
 * 会话持久化抽象：本地文件、微信云数据库等实现同一契约，供 CLI / HTTP / 云函数注入。
 */
export interface SessionStore {
  loadSession(userId: string, scenarioId: string): Promise<Session>;
  saveSession(session: Session): Promise<void>;
  deleteSession(userId: string, scenarioId: string): Promise<void>;
  sessionExists(userId: string, scenarioId: string): Promise<boolean>;
  buildDemoSession(
    userId: string,
    scenarioId: string,
    targetNpcId?: string,
    playerRoleProfile?: PlayerRoleProfile
  ): Session;
}
