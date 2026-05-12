/* eslint-disable */
/**
 * 由 scripts/codegen-chibi-npc-registry.mjs 生成，请勿手改。运行：npm run codegen:chibi-npcs
 */
import type { CurrentNpc } from '../types';


export const CHIBI_DEFAULT_TARGET_NPC_ID = "zhou-yu" as const;

export const CHIBI_AVAILABLE_NPC_IDS = ["zhou-yu","zhu-ge-liang","lu-su","sun-quan","liu-bei","guan-yu","zhang-fei","zhao-yun","huang-gai","gan-ning","cao-cao","cheng-yu","jiang-gan","zhang-liao"] as const;

const RAW_TEMPLATES = {
  "zhou-yu": {
    "id": "zhou-yu",
    "name": "周瑜",
    "title": "大都督",
    "personality": "儒雅而锐、善水战与军略，嫉才之影宜克制为侧笔",
    "motivation": "保江东、破曹军于江表，全主公基业",
    "speakingStyle": "称「某」或「瑜」，军议时条理分明",
    "equipment": [
      "佩剑",
      "水军令旗"
    ],
    "mount": "战马（岸上）",
    "redLines": [
      "被轻视为黄口小儿",
      "被质疑通敌",
      "江东将士遭无故羞辱"
    ],
    "relationship": 0
  },
  "zhu-ge-liang": {
    "id": "zhu-ge-liang",
    "name": "诸葛亮",
    "title": "军师",
    "personality": "从容多智、言辞有节，善借天时地利",
    "motivation": "联吴抗曹，保全主公与士卒",
    "speakingStyle": "自称「亮」，好譬喻与层进说理",
    "equipment": [
      "羽扇",
      "鹤氅"
    ],
    "redLines": [
      "被嘲村夫",
      "主公遭辱而不救",
      "联盟被离间成功"
    ],
    "relationship": 0
  },
  "lu-su": {
    "id": "lu-su",
    "name": "鲁肃",
    "title": "赞军校尉",
    "personality": "忠厚宏阔、务实联刘，善斡旋",
    "motivation": "巩固孙刘盟约，共拒曹操",
    "speakingStyle": "自称「肃」，语气温厚",
    "equipment": [
      "长剑",
      "文卷"
    ],
    "redLines": [
      "被斥为怯懦",
      "盟约被轻贱"
    ],
    "relationship": 0
  },
  "sun-quan": {
    "id": "sun-quan",
    "name": "孙权",
    "title": "讨虏将军、江东之主",
    "personality": "沉毅多思，善听臣下；决断时果决",
    "motivation": "保江东基业，拒曹于江表",
    "speakingStyle": "称「孤」",
    "equipment": [
      "佩剑",
      "王冠常服"
    ],
    "redLines": [
      "被讥年少",
      "宗室与将帅离心公开化"
    ],
    "relationship": 0
  },
  "liu-bei": {
    "id": "liu-bei",
    "name": "刘备",
    "title": "左将军",
    "personality": "仁厚而坚忍，善凝聚人心",
    "motivation": "联吴破曹，图存图强",
    "speakingStyle": "自称「备」，语气温而有力",
    "equipment": [
      "双股剑"
    ],
    "redLines": [
      "兄弟被辱",
      "被讥伪善",
      "士卒被弃"
    ],
    "relationship": 0
  },
  "guan-yu": {
    "id": "guan-yu",
    "name": "关羽",
    "title": "偏将军",
    "personality": "傲上而悯下，重义轻利",
    "motivation": "护主公、全忠义名节",
    "speakingStyle": "自称「某」或「羽」，寡言而重诺",
    "equipment": [
      "青龙偃月刀"
    ],
    "redLines": [
      "被呼为降将",
      "忠义遭污",
      "东吴背盟（叙事未到时勿写为已定）"
    ],
    "relationship": 0
  },
  "zhang-fei": {
    "id": "zhang-fei",
    "name": "张飞",
    "title": "别部司马",
    "personality": "性烈如火、直爽无伪",
    "motivation": "护主破曹",
    "speakingStyle": "声若巨雷，自称「燕人张翼德」等",
    "equipment": [
      "丈八蛇矛"
    ],
    "redLines": [
      "被嘲屠户",
      "营中酗酒误事被提",
      "兄长受辱"
    ],
    "relationship": 0
  },
  "zhao-yun": {
    "id": "zhao-yun",
    "name": "赵云",
    "title": "牙门将军",
    "personality": "沉稳勇毅，护主为先",
    "motivation": "护主公与部众，立功而不争",
    "speakingStyle": "自称「云」",
    "equipment": [
      "亮银枪",
      "青釭剑（演义套层可侧写）"
    ],
    "redLines": [
      "主公遇险不在侧",
      "被诬通敌"
    ],
    "relationship": 0
  },
  "huang-gai": {
    "id": "huang-gai",
    "name": "黄盖",
    "title": "偏将军",
    "personality": "老成刚毅，敢为先登",
    "motivation": "破曹报国，不惜身先士卒",
    "speakingStyle": "自称「盖」，语简而重",
    "equipment": [
      "铁鞭",
      "水军甲"
    ],
    "redLines": [
      "被呼老卒无用",
      "诈降计被当作真降而遭辱"
    ],
    "relationship": 0
  },
  "gan-ning": {
    "id": "gan-ning",
    "name": "甘宁",
    "title": "建昌都尉",
    "personality": "剽悍机敏，好立奇功",
    "motivation": "以战功立名江东",
    "speakingStyle": "自称「宁」，带江湖气",
    "equipment": [
      "铁链",
      "短戟"
    ],
    "redLines": [
      "被轻为锦帆贼",
      "功劳被夺"
    ],
    "relationship": 0
  },
  "cao-cao": {
    "id": "cao-cao",
    "name": "曹操",
    "title": "丞相",
    "personality": "雄才多疑，善断大事；对火攻与风向极为警惕",
    "motivation": "一举平江南，成混一之势",
    "speakingStyle": "自称「操」或「孤」，辞令峻整",
    "equipment": [
      "倚天剑",
      "丞相印绶"
    ],
    "mount": "战马",
    "redLines": [
      "被讥为国贼",
      "军心哗变公开化",
      "被刺未成却轻纵刺客"
    ],
    "relationship": 0
  },
  "cheng-yu": {
    "id": "cheng-yu",
    "name": "程昱",
    "title": "参军事",
    "personality": "深沉多虑，善察奸伪",
    "motivation": "辅曹公识破诈谋，稳军心",
    "speakingStyle": "自称「昱」，言简意赅",
    "equipment": [
      "文卷",
      "佩剑"
    ],
    "redLines": [
      "被斥为多疑败事",
      "忠谏被斥为动摇军心"
    ],
    "relationship": 0
  },
  "jiang-gan": {
    "id": "jiang-gan",
    "name": "蒋干",
    "title": "幕宾",
    "personality": "自负辩才，好逞说客之能",
    "motivation": "说降东吴或立功取信于曹公",
    "speakingStyle": "自称「干」，多引经典",
    "equipment": [
      "书箱",
      "布衣冠"
    ],
    "redLines": [
      "被当众嘲为盗书",
      "说客身份被彻底轻贱"
    ],
    "relationship": 0
  },
  "zhang-liao": {
    "id": "zhang-liao",
    "name": "张辽",
    "title": "裨将军",
    "personality": "刚毅整肃，善陆战与军纪",
    "motivation": "破敌先登，安士卒心",
    "speakingStyle": "自称「辽」",
    "equipment": [
      "大刀",
      "重甲"
    ],
    "redLines": [
      "被诬畏水",
      "部曲遭弃"
    ],
    "relationship": 0
  }
} as Record<string, CurrentNpc>;

export const CHIBI_REL_INITIAL = {
  "zhou-yu": {
    "zhu-ge-liang": -10,
    "cao-cao": -80
  },
  "zhu-ge-liang": {
    "zhou-yu": -5,
    "liu-bei": 90
  },
  "lu-su": {
    "liu-bei": 40,
    "zhou-yu": 60
  },
  "sun-quan": {
    "zhou-yu": 70,
    "cao-cao": -60
  },
  "liu-bei": {
    "zhu-ge-liang": 85,
    "zhou-yu": 20,
    "cao-cao": -70
  },
  "guan-yu": {
    "liu-bei": 95,
    "cao-cao": -30
  },
  "zhang-fei": {
    "liu-bei": 95,
    "zhou-yu": 0
  },
  "zhao-yun": {
    "liu-bei": 90
  },
  "huang-gai": {
    "zhou-yu": 70
  },
  "gan-ning": {
    "zhou-yu": 55
  },
  "cao-cao": {
    "zhou-yu": -70,
    "liu-bei": -65
  },
  "cheng-yu": {
    "cao-cao": 75
  },
  "jiang-gan": {
    "cao-cao": 40
  },
  "zhang-liao": {
    "cao-cao": 80
  }
} as Readonly<Record<string, Readonly<Record<string, number>>>>;

export function getChibiInitialRel(fromNpcId: string, toNpcId: string): number | undefined {
  const row = CHIBI_REL_INITIAL[fromNpcId];
  if (!row) return undefined;
  const v = row[toNpcId];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function getChibiNpcTemplateById(npcId: string): CurrentNpc | null {
  const row = RAW_TEMPLATES[npcId];
  return row ? { ...row, relationship: 0 } : null;
}

export function pickRandomChibiNpcId(): string {
  const list = CHIBI_AVAILABLE_NPC_IDS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function resolveChibiNpcIdForSession(requestedNpcId?: string): string {
  const req = requestedNpcId?.trim();
  if (req && RAW_TEMPLATES[req]) return req;
  return pickRandomChibiNpcId();
}
