/**
 * 虎牢关新开局：按玩家扮演身份选择「关系合理」的首位对话 NPC，避免全卡司均匀随机导致叙事跳脱。
 * 与 `scenarios/hulaguan/config.json` 卡司一致；表为代码常量（剧本 JSON 只读）。
 */
import type { PlayerRoleProfile } from '../types';
import {
  HULAGUAN_AVAILABLE_NPC_IDS,
  HULAGUAN_DEFAULT_TARGET_NPC_ID,
} from './hulaguan-npc-registry.generated';

const AVAILABLE = new Set<string>([...HULAGUAN_AVAILABLE_NPC_IDS]);

/** 与前端 `hulaguan-roster` 展示名一致，用于 generalName → npcId */
const GENERAL_DISPLAY_NAME_TO_ID: Record<string, string> = {
  吕布: 'lv-bu',
  董卓: 'dong-zhuo',
  刘备: 'liu-bei',
  关羽: 'guan-yu',
  张飞: 'zhang-fei',
  曹操: 'cao-cao',
  袁绍: 'yuan-shao',
  孙坚: 'sun-jian',
  公孙瓒: 'gongsun-zan',
  孔融: 'kong-rong',
  夏侯惇: 'xiahou-dun',
  典韦: 'dian-wei',
  曹仁: 'cao-ren',
  华雄: 'hua-xiong',
  赵云: 'zhao-yun',
  马腾: 'ma-teng',
  袁术: 'yuan-shu',
  夏侯渊: 'xiahou-yuan',
  曹洪: 'cao-hong',
};

/**
 * 扮演武将 id → 优先对话目标（关前讨董语境：盟军侧先对线吕布/华雄等；董吕侧先对线盟军代表）。
 * 取列表中第一个「在卡司内且不等于扮演本人」的 id。
 */
const PREFERRED_TARGETS_BY_PLAYING_ID: Record<string, readonly string[]> = {
  'liu-bei': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao', 'sun-jian', 'xiahou-dun'],
  'guan-yu': ['lv-bu', 'hua-xiong', 'cao-cao', 'yuan-shao', 'xiahou-dun'],
  'zhang-fei': ['lv-bu', 'hua-xiong', 'cao-cao', 'yuan-shao', 'xiahou-dun'],
  'zhao-yun': ['lv-bu', 'hua-xiong', 'gongsun-zan', 'yuan-shao', 'cao-cao'],
  'cao-cao': ['lv-bu', 'hua-xiong', 'liu-bei', 'yuan-shao', 'dong-zhuo'],
  'xiahou-dun': ['lv-bu', 'hua-xiong', 'liu-bei', 'cao-cao', 'yuan-shao'],
  'dian-wei': ['lv-bu', 'hua-xiong', 'liu-bei', 'cao-cao'],
  'cao-ren': ['lv-bu', 'hua-xiong', 'liu-bei', 'cao-cao'],
  'xiahou-yuan': ['lv-bu', 'hua-xiong', 'liu-bei', 'cao-cao'],
  'cao-hong': ['lv-bu', 'hua-xiong', 'liu-bei', 'cao-cao'],
  'yuan-shao': ['lv-bu', 'hua-xiong', 'cao-cao', 'liu-bei', 'sun-jian'],
  'sun-jian': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao', 'liu-bei'],
  'gongsun-zan': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao', 'zhao-yun'],
  'kong-rong': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao'],
  'ma-teng': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao'],
  'yuan-shu': ['lv-bu', 'hua-xiong', 'yuan-shao', 'cao-cao'],
  'dong-zhuo': ['cao-cao', 'yuan-shao', 'liu-bei', 'guan-yu', 'lv-bu'],
  'lv-bu': ['guan-yu', 'zhang-fei', 'liu-bei', 'cao-cao', 'yuan-shao'],
  'hua-xiong': ['guan-yu', 'cao-cao', 'yuan-shao', 'liu-bei', 'zhang-fei'],
};

/** 原创角色：联军阵前语境，避免默认抽到洛阳中枢线董卓 */
const OC_PREFERRED_TARGETS: readonly string[] = ['xiahou-dun', 'hua-xiong', 'lv-bu', 'yuan-shao', 'cao-cao'];

function firstAvailablePreferred(playId: string | undefined, ordered: readonly string[]): string {
  for (const id of ordered) {
    if (!AVAILABLE.has(id)) continue;
    if (playId && id === playId) continue;
    return id;
  }
  if (AVAILABLE.has(HULAGUAN_DEFAULT_TARGET_NPC_ID)) {
    if (!playId || HULAGUAN_DEFAULT_TARGET_NPC_ID !== playId) {
      return HULAGUAN_DEFAULT_TARGET_NPC_ID;
    }
  }
  for (const id of HULAGUAN_AVAILABLE_NPC_IDS) {
    if (!playId || id !== playId) return id;
  }
  return HULAGUAN_DEFAULT_TARGET_NPC_ID;
}

/** 与前端「扮演武将」展示名一致；用于开局写入玩家→当前 NPC 关系等 */
export function resolveGeneralDisplayNameToHulaguanNpcId(generalName: string): string | undefined {
  const name = generalName?.trim();
  if (!name) return undefined;
  return GENERAL_DISPLAY_NAME_TO_ID[name];
}

function resolvePlayingNpcIdFromGeneral(profile: PlayerRoleProfile & { mode: 'general' }): string | undefined {
  return resolveGeneralDisplayNameToHulaguanNpcId(profile.generalName);
}

/**
 * 新开局且未显式指定 `targetNpcId` 时调用；返回合法 npc id。
 */
export function resolveHulaguanInitialTargetNpcId(profile?: PlayerRoleProfile): string {
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
