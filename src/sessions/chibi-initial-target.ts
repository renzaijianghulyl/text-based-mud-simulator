/**
 * 赤壁新开局：按扮演身份选择合理首位对话 NPC。
 */
import type { PlayerRoleProfile } from '../types';
import {
  CHIBI_AVAILABLE_NPC_IDS,
  CHIBI_DEFAULT_TARGET_NPC_ID,
} from './chibi-npc-registry.generated';

const AVAILABLE = new Set<string>([...CHIBI_AVAILABLE_NPC_IDS]);

const GENERAL_DISPLAY_NAME_TO_ID: Record<string, string> = {
  周瑜: 'zhou-yu',
  诸葛亮: 'zhu-ge-liang',
  孔明: 'zhu-ge-liang',
  鲁肃: 'lu-su',
  孙权: 'sun-quan',
  刘备: 'liu-bei',
  关羽: 'guan-yu',
  张飞: 'zhang-fei',
  赵云: 'zhao-yun',
  黄盖: 'huang-gai',
  甘宁: 'gan-ning',
  曹操: 'cao-cao',
  程昱: 'cheng-yu',
  蒋干: 'jiang-gan',
  张辽: 'zhang-liao',
};

const PREFERRED_TARGETS_BY_PLAYING_ID: Record<string, readonly string[]> = {
  'liu-bei': ['zhou-yu', 'lu-su', 'zhu-ge-liang', 'cao-cao'],
  'guan-yu': ['zhou-yu', 'liu-bei', 'cao-cao', 'zhang-liao'],
  'zhang-fei': ['zhou-yu', 'liu-bei', 'cao-cao'],
  'zhao-yun': ['liu-bei', 'zhou-yu', 'zhu-ge-liang'],
  'zhu-ge-liang': ['zhou-yu', 'lu-su', 'liu-bei'],
  'zhou-yu': ['zhu-ge-liang', 'liu-bei', 'cao-cao', 'sun-quan'],
  'lu-su': ['liu-bei', 'zhou-yu', 'zhu-ge-liang'],
  'sun-quan': ['zhou-yu', 'lu-su', 'zhang-liao'],
  'huang-gai': ['zhou-yu', 'gan-ning'],
  'gan-ning': ['zhou-yu', 'huang-gai', 'zhang-liao'],
  'cao-cao': ['zhou-yu', 'cheng-yu', 'liu-bei', 'zhang-liao'],
  'cheng-yu': ['cao-cao', 'jiang-gan', 'zhou-yu'],
  'jiang-gan': ['cao-cao', 'cheng-yu'],
  'zhang-liao': ['cao-cao', 'zhou-yu', 'gan-ning'],
};

const OC_PREFERRED_TARGETS: readonly string[] = ['lu-su', 'zhou-yu', 'zhu-ge-liang', 'liu-bei', 'cao-cao'];

function firstAvailablePreferred(playId: string | undefined, ordered: readonly string[]): string {
  for (const id of ordered) {
    if (!AVAILABLE.has(id)) continue;
    if (playId && id === playId) continue;
    return id;
  }
  if (AVAILABLE.has(CHIBI_DEFAULT_TARGET_NPC_ID)) {
    if (!playId || CHIBI_DEFAULT_TARGET_NPC_ID !== playId) {
      return CHIBI_DEFAULT_TARGET_NPC_ID;
    }
  }
  for (const id of CHIBI_AVAILABLE_NPC_IDS) {
    if (!playId || id !== playId) return id;
  }
  return CHIBI_DEFAULT_TARGET_NPC_ID;
}

export function resolveGeneralDisplayNameToChibiNpcId(generalName: string): string | undefined {
  const name = generalName?.trim();
  if (!name) return undefined;
  return GENERAL_DISPLAY_NAME_TO_ID[name];
}

function resolvePlayingNpcIdFromGeneral(profile: PlayerRoleProfile & { mode: 'general' }): string | undefined {
  return resolveGeneralDisplayNameToChibiNpcId(profile.generalName);
}

export function resolveChibiInitialTargetNpcId(profile?: PlayerRoleProfile): string {
  if (!profile || profile.mode === 'oc') {
    return firstAvailablePreferred(undefined, OC_PREFERRED_TARGETS);
  }
  const playId = resolvePlayingNpcIdFromGeneral(profile);
  if (!playId || !AVAILABLE.has(playId)) {
    return firstAvailablePreferred(undefined, OC_PREFERRED_TARGETS);
  }
  const pool = PREFERRED_TARGETS_BY_PLAYING_ID[playId];
  if (!pool || pool.length === 0) {
    return firstAvailablePreferred(playId, OC_PREFERRED_TARGETS);
  }
  return firstAvailablePreferred(playId, pool);
}
