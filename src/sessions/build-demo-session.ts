import type { CurrentNpc, PlayerRoleProfile, Session } from '../types';
import { INITIAL_INTENT_QUOTA_GRANTED } from './intent-quota';

export function sessionKey(userId: string, scenarioId: string): string {
  return `${userId}_${scenarioId}`;
}

/**
 * 由已解析的当前 NPC 构造一条新会话（无 I/O，供文件存储与云存储共用）。
 */
export function buildDemoSessionFromNpc(
  userId: string,
  scenarioId: string,
  npc: CurrentNpc,
  playerRoleProfile?: PlayerRoleProfile
): Session {
  const sessionId = sessionKey(userId, scenarioId);
  const now = new Date();
  const session: Session = {
    _id: sessionId,
    sessionId,
    userId,
    scenarioId,
    npcs: {
      current: { ...npc },
    },
    relationships: { [npc.id]: npc.relationship },
    player: { hp: 100, maxHp: 100, name: playerRoleProfile?.mode === 'oc' ? playerRoleProfile.name : '玩家' },
    ...(playerRoleProfile ? { playerRoleProfile } : {}),
    recentSummaryLines: [],
    recentPhrases: [],
    keyEvents: [],
    cumulativeState: {
      totalRounds: 0,
      hp: 100,
      maxHp: 100,
      status: '自由',
      environment: {
        time: '清晨',
        weather: '风沙微起',
        location: '虎牢关前营帐',
      },
    },
    history: [],
    currentRound: 1,
    intentQuotaGranted: INITIAL_INTENT_QUOTA_GRANTED,
    intentQuotaConsumed: 0,
    intentQuotaShareClaims: 0,
    createdAt: now,
    updatedAt: now,
  };
  return JSON.parse(JSON.stringify(session)) as Session;
}
