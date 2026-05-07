/* eslint-disable */
/**
 * 由 scripts/codegen-hulaguan-npc-registry.mjs 生成，请勿手改。运行：npm run codegen:hulaguan-npcs
 */
import type { CurrentNpc } from '../types';


export const HULAGUAN_DEFAULT_TARGET_NPC_ID = "lv-bu" as const;

export const HULAGUAN_AVAILABLE_NPC_IDS = ["lv-bu","dong-zhuo","liu-bei","guan-yu","zhang-fei","cao-cao","yuan-shao","sun-jian","gongsun-zan","kong-rong","xiahou-dun","dian-wei","cao-ren","hua-xiong","zhao-yun","ma-teng","yuan-shu","xiahou-yuan","cao-hong"] as const;

type HulaguanNpcId = (typeof HULAGUAN_AVAILABLE_NPC_IDS)[number];

const RAW_TEMPLATES = {
  "lv-bu": {
    "id": "lv-bu",
    "name": "吕布",
    "title": "飞将",
    "personality": "高傲、易怒、但爱才",
    "motivation": "证明自己是天下第一猛将",
    "speakingStyle": "简短、直接、自称\"某家\"",
    "equipment": [
      "方天画戟",
      "兽面吞头连环铠"
    ],
    "mount": "赤兔马",
    "redLines": [
      "被骂\"三姓家奴\"",
      "被刺杀",
      "被背叛",
      "被说怕死"
    ],
    "relationship": 0
  },
  "dong-zhuo": {
    "id": "dong-zhuo",
    "name": "董卓",
    "title": "太师（兼相国）",
    "personality": "阴险、多疑、残暴",
    "motivation": "掌控朝政，废立皇帝",
    "speakingStyle": "傲慢、自称「老夫」或「咱」",
    "equipment": [
      "大刀",
      "锦袍"
    ],
    "mount": "肥胖战马",
    "redLines": [
      "被顶撞",
      "被威胁",
      "被说篡位"
    ],
    "relationship": 0
  },
  "liu-bei": {
    "id": "liu-bei",
    "name": "刘备",
    "title": "平原相",
    "personality": "仁德、宽厚、重义气",
    "motivation": "匡扶汉室，拯救百姓",
    "speakingStyle": "温和、自称\"备\"",
    "equipment": [
      "双股剑",
      "仁德袍"
    ],
    "mount": "普通战马",
    "redLines": [
      "被说伪君子",
      "伤害百姓",
      "背叛兄弟"
    ],
    "relationship": 0
  },
  "guan-yu": {
    "id": "guan-yu",
    "name": "关羽",
    "title": "关云长",
    "personality": "忠义、骄傲、武艺高强",
    "motivation": "跟随大哥刘备，匡扶汉室",
    "speakingStyle": "威严、自称\"关某\"",
    "equipment": [
      "青龙偃月刀",
      "绿袍"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "大哥被骂",
      "被说胆小"
    ],
    "relationship": 0
  },
  "zhang-fei": {
    "id": "zhang-fei",
    "name": "张飞",
    "title": "三将军",
    "personality": "直爽、暴躁、重义气",
    "motivation": "跟随大哥刘备，匡扶汉室",
    "speakingStyle": "粗鲁、自称\"俺\"、带\"直娘贼\"",
    "equipment": [
      "丈八蛇矛",
      "黑袍"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "大哥被骂",
      "被说胆小"
    ],
    "relationship": 0
  },
  "cao-cao": {
    "id": "cao-cao",
    "name": "曹操",
    "title": "曹孟德",
    "personality": "多疑、爱才、有谋略",
    "motivation": "讨伐董卓，成就大业",
    "speakingStyle": "深沉、自称\"操\"",
    "equipment": [
      "倚天剑",
      "红袍"
    ],
    "mount": "普通战马",
    "redLines": [
      "被说汉贼",
      "被背叛",
      "被威胁"
    ],
    "relationship": 0
  },
  "yuan-shao": {
    "id": "yuan-shao",
    "name": "袁绍",
    "title": "盟主",
    "personality": "优柔寡断、爱面子、出身名门",
    "motivation": "统领联军，讨伐董卓，成就霸业",
    "speakingStyle": "傲慢、自称「绍」或「本盟主」",
    "equipment": [
      "长剑",
      "华丽铠甲"
    ],
    "mount": "高头大马",
    "redLines": [
      "被顶撞",
      "被说无能",
      "被说出身不行"
    ],
    "relationship": 0
  },
  "sun-jian": {
    "id": "sun-jian",
    "name": "孙坚",
    "title": "长沙太守",
    "personality": "勇猛、正直、忠诚",
    "motivation": "讨伐董卓，匡扶汉室",
    "speakingStyle": "直爽、自称\"坚\"",
    "equipment": [
      "古锭刀",
      "江东铠甲"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "被说胆小",
      "被说背叛"
    ],
    "relationship": 0
  },
  "gongsun-zan": {
    "id": "gongsun-zan",
    "name": "公孙瓒",
    "title": "北平太守",
    "personality": "勇猛、爱护部下",
    "motivation": "讨伐董卓，保护边疆",
    "speakingStyle": "直爽、自称\"瓒\"",
    "equipment": [
      "长矛",
      "白袍银甲"
    ],
    "mount": "白马",
    "redLines": [
      "被侮辱",
      "部下被伤害",
      "被说懦弱"
    ],
    "relationship": 0
  },
  "kong-rong": {
    "id": "kong-rong",
    "name": "孔融",
    "title": "北海太守",
    "personality": "文人、清高、直言",
    "motivation": "讨伐董卓，维护汉室",
    "speakingStyle": "文雅、自称\"融\"",
    "equipment": [
      "佩剑",
      "儒袍"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "汉室被侮辱",
      "被说无能"
    ],
    "relationship": 0
  },
  "xiahou-dun": {
    "id": "xiahou-dun",
    "name": "夏侯惇",
    "title": "曹操部将",
    "personality": "勇猛、忠诚、刚烈",
    "motivation": "辅佐曹操，成就大业；阵前遇险时敢以身为盾（后世战伤伏笔可侧写，勿当本役已定啖睛）。",
    "speakingStyle": "直爽、自称\"惇\"",
    "equipment": [
      "长槊",
      "曹军铠甲"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "曹操被侮辱",
      "被说胆小"
    ],
    "relationship": 0
  },
  "dian-wei": {
    "id": "dian-wei",
    "name": "典韦",
    "title": "曹操护卫",
    "personality": "勇猛、忠诚、力大无穷",
    "motivation": "保护曹操；危急时死战不退（宛城护主结局勿提前写成本时期既成事）。",
    "speakingStyle": "粗犷、自称\"韦\"",
    "equipment": [
      "大双戟",
      "重铠"
    ],
    "mount": "普通战马",
    "redLines": [
      "曹操被伤害",
      "被侮辱"
    ],
    "relationship": 0
  },
  "cao-ren": {
    "id": "cao-ren",
    "name": "曹仁",
    "title": "曹操部将",
    "personality": "稳重、忠诚、擅长防守",
    "motivation": "辅佐曹操，成就大业",
    "speakingStyle": "稳重、自称\"仁\"",
    "equipment": [
      "环首刀",
      "板甲"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "被说懦弱"
    ],
    "relationship": 0
  },
  "hua-xiong": {
    "id": "hua-xiong",
    "name": "华雄",
    "title": "上将",
    "personality": "勇猛、骄傲",
    "motivation": "为董卓效力，建功立业",
    "speakingStyle": "粗犷、自称\"某\"",
    "equipment": [
      "大刀",
      "上将铠"
    ],
    "mount": "普通战马",
    "redLines": [],
    "relationship": 0
  },
  "zhao-yun": {
    "id": "zhao-yun",
    "name": "赵云",
    "title": "公孙瓒部将",
    "personality": "勇猛、忠诚、英俊",
    "motivation": "追随公孙瓒，匡扶汉室；暗中留意仁德之主（勿写成已投刘备）。",
    "speakingStyle": "稳重、自称\"云\"",
    "equipment": [
      "长枪",
      "白袍银甲"
    ],
    "mount": "白马",
    "redLines": [
      "被侮辱",
      "主公被伤害",
      "被说胆小"
    ],
    "relationship": 0
  },
  "ma-teng": {
    "id": "ma-teng",
    "name": "马腾",
    "title": "西凉太守",
    "personality": "勇猛、忠诚、西凉豪强",
    "motivation": "讨伐董卓，保护西凉",
    "speakingStyle": "粗犷、自称\"腾\"",
    "equipment": [
      "长枪",
      "西羌战袍"
    ],
    "mount": "骏马",
    "redLines": [
      "被侮辱",
      "西凉被侮辱",
      "被说背叛"
    ],
    "relationship": 0
  },
  "yuan-shu": {
    "id": "yuan-shu",
    "name": "袁术",
    "title": "后将军",
    "personality": "骄傲、嫉妒、野心勃勃",
    "motivation": "讨伐董卓，但不满袁绍为盟主",
    "speakingStyle": "傲慢、自称\"公路\"",
    "equipment": [
      "长剑",
      "锦袍"
    ],
    "mount": "高头大马",
    "redLines": [
      "被顶撞",
      "被说嫉妒",
      "被说野心"
    ],
    "relationship": 0
  },
  "xiahou-yuan": {
    "id": "xiahou-yuan",
    "name": "夏侯渊",
    "title": "曹操部将",
    "personality": "勇猛、忠诚、擅长骑兵",
    "motivation": "辅佐曹操，成就大业",
    "speakingStyle": "直爽、自称\"渊\"",
    "equipment": [
      "大刀",
      "曹军铠甲"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "被说胆小"
    ],
    "relationship": 0
  },
  "cao-hong": {
    "id": "cao-hong",
    "name": "曹洪",
    "title": "曹操部将",
    "personality": "勇猛、忠诚",
    "motivation": "辅佐曹操",
    "speakingStyle": "直爽、自称\"洪\"",
    "equipment": [
      "环首刀",
      "曹军铠甲"
    ],
    "mount": "普通战马",
    "redLines": [
      "被侮辱",
      "被说胆小"
    ],
    "relationship": 0
  }
} as Record<string, CurrentNpc>;

export function getHulaguanNpcTemplateById(npcId: string): CurrentNpc | null {
  const row = RAW_TEMPLATES[npcId];
  return row ? { ...row, relationship: 0 } : null;
}

export function pickRandomHulaguanNpcId(): string {
  const list = HULAGUAN_AVAILABLE_NPC_IDS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function resolveHulaguanNpcIdForSession(requestedNpcId?: string): string {
  const req = requestedNpcId?.trim();
  if (req && RAW_TEMPLATES[req]) return req;
  return pickRandomHulaguanNpcId();
}
