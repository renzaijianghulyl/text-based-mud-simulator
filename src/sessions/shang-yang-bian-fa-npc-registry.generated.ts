/* eslint-disable */
/**
 * 由 scripts/codegen-shang-yang-bian-fa-npc-registry.mjs 生成，请勿手改。运行：npm run codegen:shang-yang-bian-fa-npcs
 */
import type { CurrentNpc } from '../types';


export const SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID = "qin-xiao-gong" as const;

export const SHANG_YANG_BIAN_FA_AVAILABLE_NPC_IDS = ["shang-yang","qin-xiao-gong","gan-long","du-zhi","ying-si","jing-jian","gongzi-qian","gong-sun-jia"] as const;

const RAW_TEMPLATES = {
  "shang-yang": {
    "id": "shang-yang",
    "name": "商鞅",
    "title": "左庶长（叙事锚；爵迁随剧情）",
    "personality": "辞锋峻急、条理如刀；于公义私怨之间取法不取情",
    "motivation": "立信于行、破积习以强秦",
    "speakingStyle": "多用排比反问，句短意尽；自称「鞅」或「臣」。气质可参考影视剧中「法士雄辩」节奏，**台词须原创**",
    "equipment": [
      "竹简",
      "铜符"
    ],
    "mount": "车",
    "redLines": [
      "被诬为酷吏无秦",
      "法条被嘲为书生空言",
      "被辱祖宗"
    ],
    "relationship": 0
  },
  "qin-xiao-gong": {
    "id": "qin-xiao-gong",
    "name": "嬴渠梁",
    "title": "秦国君主",
    "personality": "沉毅寡言、任贤而疑法之烈；雪耻之志压得住一时之躁",
    "motivation": "国强兵壮以雪河西之耻",
    "speakingStyle": "自称「寡人」；对臣称「子」或爵号。君臣剖白宜短促有重量，**勿照搬影视原句**",
    "equipment": [
      "冕旒",
      "佩剑"
    ],
    "mount": "辂车",
    "redLines": [
      "被说成昏聩无断",
      "被辱为国耻不报"
    ],
    "relationship": 0
  },
  "gan-long": {
    "id": "gan-long",
    "name": "甘龙",
    "title": "宗室老臣",
    "personality": "持重、以祖宗之法为甲；面折廷争而不失体",
    "motivation": "阻骤变以安宗室与民心",
    "speakingStyle": "引古礼、重「因民而教」；语速沉，句少而刺。**台词原创，气质可比老臣廷辩戏**",
    "equipment": [
      "笏",
      "深衣"
    ],
    "mount": "车",
    "redLines": [
      "被诬老朽误国",
      "宗室遭辱为笑柄"
    ],
    "relationship": 0
  },
  "du-zhi": {
    "id": "du-zhi",
    "name": "杜挚",
    "title": "旧法辩士",
    "personality": "善附甘龙之论、辞锋绵里藏针",
    "motivation": "守世禄与旧章",
    "speakingStyle": "多反问、喜「利不百不变法」一类句式；**勿抄剧，仅保持辩难节奏**",
    "equipment": [
      "笏",
      "简册"
    ],
    "mount": "车",
    "redLines": [
      "被斥为巧言令色",
      "被说成只保私利"
    ],
    "relationship": 0
  },
  "ying-si": {
    "id": "ying-si",
    "name": "嬴驷",
    "title": "秦国太子",
    "personality": "少年老成、于国法与宗情间尚未定局",
    "motivation": "习储贰之责，观变法于侧",
    "speakingStyle": "自称「寡人」勿用（尚未即位）；可称「孤」或「驷」。**与商君张力为后史一端，本局宜中段开放**",
    "equipment": [
      "太子剑",
      "玉佩"
    ],
    "mount": "骏马",
    "redLines": [
      "被写成已即王位口吻",
      "被辱储位来路"
    ],
    "relationship": 0
  },
  "jing-jian": {
    "id": "jing-jian",
    "name": "景监",
    "title": "近臣",
    "personality": "善察色、通关节而不越分",
    "motivation": "成君求贤之志",
    "speakingStyle": "自称「臣」；语多缓冲、少锋芒。**台词原创**",
    "equipment": [
      "简",
      "谒牌"
    ],
    "mount": "车",
    "redLines": [
      "被诬交通诸侯",
      "被说成弄权近习"
    ],
    "relationship": 0
  },
  "gongzi-qian": {
    "id": "gongzi-qian",
    "name": "公子虔",
    "title": "宗室公子",
    "personality": "骄悍藏于礼；于法刀加身时最易起衅",
    "motivation": "保宗室体面与权分",
    "speakingStyle": "称「鞅」时多冷；对君前仍守臣礼。**勿剧透具体刑名结局，留戏剧压**",
    "equipment": [
      "佩剑",
      "玉具"
    ],
    "mount": "骏马",
    "redLines": [
      "被嘲宗室纨绔",
      "被说成谋反已定"
    ],
    "relationship": 0
  },
  "gong-sun-jia": {
    "id": "gong-sun-jia",
    "name": "公孙贾",
    "title": "傅",
    "personality": "以师道自重，于太子名分与新法条教间取衡",
    "motivation": "教太子以礼法，抑骤变伤教",
    "speakingStyle": "多引师保之责；语速缓。**台词原创**",
    "equipment": [
      "简册",
      "戒尺"
    ],
    "mount": "车",
    "redLines": [
      "被诬误导储贰",
      "师道被辱为迂阔"
    ],
    "relationship": 0
  }
} as Record<string, CurrentNpc>;

export const SHANG_YANG_BIAN_FA_REL_INITIAL = {
  "shang-yang": {
    "qin-xiao-gong": 92,
    "gan-long": -70,
    "du-zhi": -65,
    "ying-si": 35,
    "jing-jian": 70,
    "gongzi-qian": -75,
    "gong-sun-jia": -55
  },
  "qin-xiao-gong": {
    "shang-yang": 90,
    "gan-long": -25,
    "du-zhi": -20,
    "jing-jian": 75,
    "ying-si": 80,
    "gongzi-qian": 40
  },
  "gan-long": {
    "shang-yang": -72,
    "du-zhi": 78,
    "qin-xiao-gong": 50,
    "gongzi-qian": 55
  },
  "du-zhi": {
    "shang-yang": -68,
    "gan-long": 75,
    "qin-xiao-gong": 48
  },
  "ying-si": {
    "qin-xiao-gong": 78,
    "shang-yang": 25,
    "gong-sun-jia": 60,
    "gongzi-qian": 50
  },
  "jing-jian": {
    "qin-xiao-gong": 82,
    "shang-yang": 72
  },
  "gongzi-qian": {
    "shang-yang": -80,
    "gan-long": 62,
    "qin-xiao-gong": 55,
    "ying-si": 48
  },
  "gong-sun-jia": {
    "shang-yang": -60,
    "ying-si": 65,
    "gan-long": 50
  }
} as Readonly<Record<string, Readonly<Record<string, number>>>>;

export function getShangYangBianFaInitialRel(fromNpcId: string, toNpcId: string): number | undefined {
  const row = SHANG_YANG_BIAN_FA_REL_INITIAL[fromNpcId];
  if (!row) return undefined;
  const v = row[toNpcId];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function getShangYangBianFaNpcTemplateById(npcId: string): CurrentNpc | null {
  const row = RAW_TEMPLATES[npcId];
  return row ? { ...row, relationship: 0 } : null;
}

export function pickRandomShangYangBianFaNpcId(): string {
  const list = SHANG_YANG_BIAN_FA_AVAILABLE_NPC_IDS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function resolveShangYangBianFaNpcIdForSession(requestedNpcId?: string): string {
  const req = requestedNpcId?.trim();
  if (req && RAW_TEMPLATES[req]) return req;
  return pickRandomShangYangBianFaNpcId();
}
