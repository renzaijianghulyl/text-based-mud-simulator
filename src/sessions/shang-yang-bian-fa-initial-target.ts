/**
 * 商鞅变法新开局：按玩家扮演身份选择合理首位对话 NPC。
 */
import type { PlayerRoleProfile } from '../types';
import {
  SHANG_YANG_BIAN_FA_AVAILABLE_NPC_IDS,
  SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID,
} from './shang-yang-bian-fa-npc-registry.generated';

const AVAILABLE = new Set<string>([...SHANG_YANG_BIAN_FA_AVAILABLE_NPC_IDS]);

const GENERAL_DISPLAY_NAME_TO_ID: Record<string, string> = {
  商鞅: 'shang-yang',
  卫鞅: 'shang-yang',
  左庶长: 'shang-yang',
  秦孝公: 'qin-xiao-gong',
  嬴渠梁: 'qin-xiao-gong',
  孝公: 'qin-xiao-gong',
  甘龙: 'gan-long',
  杜挚: 'du-zhi',
  太子: 'ying-si',
  太子驷: 'ying-si',
  嬴驷: 'ying-si',
  景监: 'jing-jian',
  公子虔: 'gongzi-qian',
  公孙贾: 'gong-sun-jia',
};

const PREFERRED_TARGETS_BY_PLAYING_ID: Record<string, readonly string[]> = {
  'shang-yang': ['qin-xiao-gong', 'gan-long', 'jing-jian', 'du-zhi'],
  'qin-xiao-gong': ['shang-yang', 'gan-long', 'jing-jian', 'ying-si'],
  'gan-long': ['shang-yang', 'du-zhi', 'qin-xiao-gong', 'gongzi-qian'],
  'du-zhi': ['shang-yang', 'gan-long', 'qin-xiao-gong', 'gong-sun-jia'],
  'ying-si': ['qin-xiao-gong', 'gong-sun-jia', 'shang-yang', 'gongzi-qian'],
  'jing-jian': ['qin-xiao-gong', 'shang-yang', 'gan-long', 'ying-si'],
  'gongzi-qian': ['gan-long', 'shang-yang', 'qin-xiao-gong', 'ying-si'],
  'gong-sun-jia': ['ying-si', 'shang-yang', 'gan-long', 'qin-xiao-gong'],
};

const OC_PREFERRED_TARGETS: readonly string[] = [
  'shang-yang',
  'gan-long',
  'qin-xiao-gong',
  'jing-jian',
];

function firstAvailablePreferred(playId: string | undefined, ordered: readonly string[]): string {
  for (const id of ordered) {
    if (!AVAILABLE.has(id)) continue;
    if (playId && id === playId) continue;
    return id;
  }
  if (AVAILABLE.has(SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID)) {
    if (!playId || SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID !== playId) {
      return SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID;
    }
  }
  for (const id of SHANG_YANG_BIAN_FA_AVAILABLE_NPC_IDS) {
    if (!playId || id !== playId) return id;
  }
  return SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID;
}

export function resolveGeneralDisplayNameToShangYangBianFaNpcId(generalName: string): string | undefined {
  const name = generalName?.trim();
  if (!name) return undefined;
  return GENERAL_DISPLAY_NAME_TO_ID[name];
}

function resolvePlayingNpcIdFromGeneral(profile: PlayerRoleProfile & { mode: 'general' }): string | undefined {
  return resolveGeneralDisplayNameToShangYangBianFaNpcId(profile.generalName);
}

export function resolveShangYangBianFaInitialTargetNpcId(profile?: PlayerRoleProfile): string {
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
