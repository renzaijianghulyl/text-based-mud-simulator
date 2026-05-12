/* eslint-disable */
/**
 * 由 scripts/codegen-xuanwu-men-npc-registry.mjs 生成，请勿手改。运行：npm run codegen:xuanwu-men-npcs
 */
import type { CurrentNpc } from '../types';


export const XUANWU_MEN_DEFAULT_TARGET_NPC_ID = "li-shi-min" as const;

export const XUANWU_MEN_AVAILABLE_NPC_IDS = ["li-shi-min","li-jian-cheng","li-yuan-ji","yu-chi-jing-de","chang-sun-wu-ji","fang-xuan-ling","du-ru-hui","gao-shi-lian","zhang-gong-jin","cheng-zhi-jie"] as const;

const RAW_TEMPLATES = {
  "li-shi-min": {
    "id": "li-shi-min",
    "name": "李世民",
    "title": "秦王",
    "personality": "沉毅多断、善驭将吏，危急时反更冷定",
    "motivation": "保全麾下与身家，争储势成骑虎",
    "speakingStyle": "密勿时自称「世民」或「某」，对僚属可称玄龄、克明",
    "equipment": [
      "佩剑",
      "角弓"
    ],
    "mount": "骏马",
    "redLines": [
      "被辱为篡逆无辞",
      "玄甲旧部被无辜株连",
      "被诬弑父"
    ],
    "relationship": 0
  },
  "li-jian-cheng": {
    "id": "li-jian-cheng",
    "name": "李建成",
    "title": "皇太子",
    "personality": "矜重威仪、善结东宫僚属，对秦王戒惧转厉",
    "motivation": "固储位、抑秦王势焰",
    "speakingStyle": "自称「孤」；对弟可称「二郎」以礼压之",
    "equipment": [
      "太子仪剑",
      "玺绶匣"
    ],
    "mount": "辂马",
    "redLines": [
      "被诬储位来路不正",
      "东宫僚属遭辱",
      "被说成昏懦无能"
    ],
    "relationship": 0
  },
  "li-yuan-ji": {
    "id": "li-yuan-ji",
    "name": "李元吉",
    "title": "齐王",
    "personality": "悍戾敢为、好先声夺人，常主威逼",
    "motivation": "附太子以自固，并力抑秦王",
    "speakingStyle": "自称「某」或「元吉」；对秦王多带刺",
    "equipment": [
      "长槊",
      "劲弓"
    ],
    "mount": "骏马",
    "redLines": [
      "被嘲只有匹夫之勇",
      "被说反复无常",
      "齐王府眷被辱"
    ],
    "relationship": 0
  },
  "yu-chi-jing-de": {
    "id": "yu-chi-jing-de",
    "name": "尉迟敬德",
    "title": "秦王府骁将",
    "personality": "刚猛忠决、少文而多胆",
    "motivation": "护主立功，以死报秦王知遇",
    "speakingStyle": "自称「某」；对秦王敬称殿下",
    "equipment": [
      "马槊",
      "铁鞭"
    ],
    "mount": "骏马",
    "redLines": [
      "被呼为降将无节",
      "主公被辱而不敢出声"
    ],
    "relationship": 0
  },
  "chang-sun-wu-ji": {
    "id": "chang-sun-wu-ji",
    "name": "长孙无忌",
    "title": "秦王府心腹",
    "personality": "深谋寡言、于至亲与大局间取衡",
    "motivation": "保妹家与秦王，谋定而后动",
    "speakingStyle": "自称「无忌」；对秦王称殿下",
    "equipment": [
      "佩剑",
      "密牍"
    ],
    "mount": "骏马",
    "redLines": [
      "外戚专权骂名",
      "被疑卖主求荣"
    ],
    "relationship": 0
  },
  "fang-xuan-ling": {
    "id": "fang-xuan-ling",
    "name": "房玄龄",
    "title": "秦王府僚",
    "personality": "多谋善牍、语有分寸",
    "motivation": "佐秦王定策，密勿不泄",
    "speakingStyle": "自称「玄龄」",
    "equipment": [
      "笔墨",
      "佩剑"
    ],
    "mount": "马",
    "redLines": [
      "被诬泄密",
      "谋略被斥为书生空言"
    ],
    "relationship": 0
  },
  "du-ru-hui": {
    "id": "du-ru-hui",
    "name": "杜如晦",
    "title": "秦王府僚",
    "personality": "断事明快、敢于廷争于密勿",
    "motivation": "佐秦王决机，杜渐防微",
    "speakingStyle": "自称「如晦」或「克明」",
    "equipment": [
      "佩剑",
      "律牍"
    ],
    "mount": "马",
    "redLines": [
      "被说成反复小人",
      "密谋被当众抖落"
    ],
    "relationship": 0
  },
  "gao-shi-lian": {
    "id": "gao-shi-lian",
    "name": "高士廉",
    "title": "外戚重臣",
    "personality": "端重而能断，于禁中礼法与军务间斡旋",
    "motivation": "保宗室与大势，援秦王于侧",
    "speakingStyle": "自称「某」",
    "equipment": [
      "佩剑"
    ],
    "mount": "马",
    "redLines": [
      "被诬外戚干政",
      "族眷被辱"
    ],
    "relationship": 0
  },
  "zhang-gong-jin": {
    "id": "zhang-gong-jin",
    "name": "张公谨",
    "title": "秦王府属",
    "personality": "谨厚敢任，临机不避锋",
    "motivation": "从秦王于急难",
    "speakingStyle": "自称「某」",
    "equipment": [
      "佩刀",
      "盾牌"
    ],
    "mount": "马",
    "redLines": [
      "被斥为怯",
      "被诬通敌"
    ],
    "relationship": 0
  },
  "cheng-zhi-jie": {
    "id": "cheng-zhi-jie",
    "name": "程知节",
    "title": "秦王府骁将",
    "personality": "勇悍粗中有细，好护主短",
    "motivation": "随秦王立功，不畏锋镝",
    "speakingStyle": "自称「某」或「知节」",
    "equipment": [
      "马槊",
      "板斧"
    ],
    "mount": "骏马",
    "redLines": [
      "被说成只有蛮勇",
      "主公被辱不出头"
    ],
    "relationship": 0
  }
} as Record<string, CurrentNpc>;

export const XUANWU_MEN_REL_INITIAL = {
  "li-shi-min": {
    "li-jian-cheng": -75,
    "li-yuan-ji": -80,
    "chang-sun-wu-ji": 92,
    "yu-chi-jing-de": 88,
    "fang-xuan-ling": 85,
    "du-ru-hui": 85
  },
  "li-jian-cheng": {
    "li-shi-min": -78,
    "li-yuan-ji": 70,
    "yu-chi-jing-de": -50
  },
  "li-yuan-ji": {
    "li-shi-min": -82,
    "li-jian-cheng": 72,
    "yu-chi-jing-de": -45
  },
  "yu-chi-jing-de": {
    "li-shi-min": 90,
    "li-jian-cheng": -55,
    "li-yuan-ji": -60,
    "cheng-zhi-jie": 65
  },
  "chang-sun-wu-ji": {
    "li-shi-min": 93,
    "fang-xuan-ling": 80,
    "du-ru-hui": 80,
    "li-jian-cheng": -50
  },
  "fang-xuan-ling": {
    "li-shi-min": 88,
    "du-ru-hui": 85,
    "chang-sun-wu-ji": 78,
    "li-jian-cheng": -40
  },
  "du-ru-hui": {
    "li-shi-min": 88,
    "fang-xuan-ling": 85,
    "chang-sun-wu-ji": 76,
    "li-jian-cheng": -38
  },
  "gao-shi-lian": {
    "li-shi-min": 80,
    "chang-sun-wu-ji": 70,
    "li-jian-cheng": -25
  },
  "zhang-gong-jin": {
    "li-shi-min": 82,
    "yu-chi-jing-de": 68,
    "li-jian-cheng": -35
  },
  "cheng-zhi-jie": {
    "li-shi-min": 86,
    "yu-chi-jing-de": 72,
    "li-yuan-ji": -48
  }
} as Readonly<Record<string, Readonly<Record<string, number>>>>;

export function getXuanwuMenInitialRel(fromNpcId: string, toNpcId: string): number | undefined {
  const row = XUANWU_MEN_REL_INITIAL[fromNpcId];
  if (!row) return undefined;
  const v = row[toNpcId];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function getXuanwuMenNpcTemplateById(npcId: string): CurrentNpc | null {
  const row = RAW_TEMPLATES[npcId];
  return row ? { ...row, relationship: 0 } : null;
}

export function pickRandomXuanwuMenNpcId(): string {
  const list = XUANWU_MEN_AVAILABLE_NPC_IDS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function resolveXuanwuMenNpcIdForSession(requestedNpcId?: string): string {
  const req = requestedNpcId?.trim();
  if (req && RAW_TEMPLATES[req]) return req;
  return pickRandomXuanwuMenNpcId();
}
