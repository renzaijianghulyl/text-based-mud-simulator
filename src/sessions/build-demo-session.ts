import type { CurrentNpc, PlayerRoleProfile, Session } from '../types';
import { defaultEnvironmentForScenario } from '../engine/memory-manager';
import { initNpcCombatForSession } from '../engine/npc-combat';
import { ensureEliminatedNpcFields, INITIAL_INTENT_QUOTA_GRANTED } from './intent-quota';
import { getChibiInitialRel } from './chibi-npc-registry.generated';
import { getHulaguanInitialRel } from './hulaguan-npc-registry.generated';
import { getXuanwuMenInitialRel } from './xuanwu-men-npc-registry.generated';
import { getShangYangBianFaInitialRel } from './shang-yang-bian-fa-npc-registry.generated';
import { resolveGeneralDisplayNameToChibiNpcId } from './chibi-initial-target';
import { resolveGeneralDisplayNameToHulaguanNpcId } from './hulaguan-initial-target';
import { resolveGeneralDisplayNameToXuanwuMenNpcId } from './xuanwu-men-initial-target';
import { resolveGeneralDisplayNameToShangYangBianFaNpcId } from './shang-yang-bian-fa-initial-target';

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
  let playerToCurrentRel = npc.relationship;
  if (playerRoleProfile?.mode === 'general') {
    let actorId: string | undefined;
    let r: number | undefined;
    if (scenarioId === 'chibi') {
      actorId = resolveGeneralDisplayNameToChibiNpcId(playerRoleProfile.generalName);
      if (actorId) r = getChibiInitialRel(actorId, npc.id);
    } else if (scenarioId === 'xuanwu-men') {
      actorId = resolveGeneralDisplayNameToXuanwuMenNpcId(playerRoleProfile.generalName);
      if (actorId) r = getXuanwuMenInitialRel(actorId, npc.id);
    } else if (scenarioId === 'shang-yang-bian-fa') {
      actorId = resolveGeneralDisplayNameToShangYangBianFaNpcId(playerRoleProfile.generalName);
      if (actorId) r = getShangYangBianFaInitialRel(actorId, npc.id);
    } else {
      actorId = resolveGeneralDisplayNameToHulaguanNpcId(playerRoleProfile.generalName);
      if (actorId) r = getHulaguanInitialRel(actorId, npc.id);
    }
    if (typeof r === 'number' && Number.isFinite(r)) {
      playerToCurrentRel = r;
    }
  }
  const session: Session = {
    _id: sessionId,
    sessionId,
    userId,
    scenarioId,
    npcs: {
      current: { ...npc, relationship: playerToCurrentRel },
    },
    relationships: { [npc.id]: playerToCurrentRel },
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
      environment: defaultEnvironmentForScenario(scenarioId),
    },
    history: [],
    currentRound: 1,
    intentQuotaGranted: INITIAL_INTENT_QUOTA_GRANTED,
    intentQuotaConsumed: 0,
    intentQuotaShareClaims: 0,
    createdAt: now,
    updatedAt: now,
  };
  ensureEliminatedNpcFields(session);
  initNpcCombatForSession(session);
  return JSON.parse(JSON.stringify(session)) as Session;
}
