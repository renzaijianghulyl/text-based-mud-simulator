/**
 * 玄武门新开局：按玩家扮演身份选择合理首位对话 NPC。
 */
import type { PlayerRoleProfile } from '../types';
import {
  XUANWU_MEN_AVAILABLE_NPC_IDS,
  XUANWU_MEN_DEFAULT_TARGET_NPC_ID,
} from './xuanwu-men-npc-registry.generated';

const AVAILABLE = new Set<string>([...XUANWU_MEN_AVAILABLE_NPC_IDS]);

const GENERAL_DISPLAY_NAME_TO_ID: Record<string, string> = {
  李世民: 'li-shi-min',
  秦王: 'li-shi-min',
  李建成: 'li-jian-cheng',
  太子: 'li-jian-cheng',
  李元吉: 'li-yuan-ji',
  齐王: 'li-yuan-ji',
  尉迟敬德: 'yu-chi-jing-de',
  敬德: 'yu-chi-jing-de',
  长孙无忌: 'chang-sun-wu-ji',
  无忌: 'chang-sun-wu-ji',
  房玄龄: 'fang-xuan-ling',
  玄龄: 'fang-xuan-ling',
  杜如晦: 'du-ru-hui',
  克明: 'du-ru-hui',
  高士廉: 'gao-shi-lian',
  士廉: 'gao-shi-lian',
  张公谨: 'zhang-gong-jin',
  公谨: 'zhang-gong-jin',
  程知节: 'cheng-zhi-jie',
  程咬金: 'cheng-zhi-jie',
};

const PREFERRED_TARGETS_BY_PLAYING_ID: Record<string, readonly string[]> = {
  'li-shi-min': ['li-jian-cheng', 'li-yuan-ji', 'yu-chi-jing-de', 'chang-sun-wu-ji'],
  'li-jian-cheng': ['li-shi-min', 'li-yuan-ji', 'yu-chi-jing-de', 'fang-xuan-ling'],
  'li-yuan-ji': ['li-shi-min', 'li-jian-cheng', 'yu-chi-jing-de', 'cheng-zhi-jie'],
  'yu-chi-jing-de': ['li-shi-min', 'chang-sun-wu-ji', 'li-jian-cheng', 'li-yuan-ji'],
  'chang-sun-wu-ji': ['li-shi-min', 'fang-xuan-ling', 'du-ru-hui', 'li-jian-cheng'],
  'fang-xuan-ling': ['li-shi-min', 'du-ru-hui', 'chang-sun-wu-ji', 'li-jian-cheng'],
  'du-ru-hui': ['li-shi-min', 'fang-xuan-ling', 'chang-sun-wu-ji', 'li-jian-cheng'],
  'gao-shi-lian': ['li-shi-min', 'chang-sun-wu-ji', 'fang-xuan-ling', 'li-jian-cheng'],
  'zhang-gong-jin': ['li-shi-min', 'yu-chi-jing-de', 'cheng-zhi-jie', 'li-yuan-ji'],
  'cheng-zhi-jie': ['li-shi-min', 'yu-chi-jing-de', 'li-yuan-ji', 'zhang-gong-jin'],
};

const OC_PREFERRED_TARGETS: readonly string[] = [
  'li-jian-cheng',
  'li-shi-min',
  'chang-sun-wu-ji',
  'fang-xuan-ling',
  'yu-chi-jing-de',
];

function firstAvailablePreferred(playId: string | undefined, ordered: readonly string[]): string {
  for (const id of ordered) {
    if (!AVAILABLE.has(id)) continue;
    if (playId && id === playId) continue;
    return id;
  }
  if (AVAILABLE.has(XUANWU_MEN_DEFAULT_TARGET_NPC_ID)) {
    if (!playId || XUANWU_MEN_DEFAULT_TARGET_NPC_ID !== playId) {
      return XUANWU_MEN_DEFAULT_TARGET_NPC_ID;
    }
  }
  for (const id of XUANWU_MEN_AVAILABLE_NPC_IDS) {
    if (!playId || id !== playId) return id;
  }
  return XUANWU_MEN_DEFAULT_TARGET_NPC_ID;
}

export function resolveGeneralDisplayNameToXuanwuMenNpcId(generalName: string): string | undefined {
  const name = generalName?.trim();
  if (!name) return undefined;
  return GENERAL_DISPLAY_NAME_TO_ID[name];
}

function resolvePlayingNpcIdFromGeneral(profile: PlayerRoleProfile & { mode: 'general' }): string | undefined {
  return resolveGeneralDisplayNameToXuanwuMenNpcId(profile.generalName);
}

export function resolveXuanwuMenInitialTargetNpcId(profile?: PlayerRoleProfile): string {
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
