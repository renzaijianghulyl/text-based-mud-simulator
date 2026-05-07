/**
 * 与 scenarios/hulaguan/config.json 的 availableNpcs 顺序及
 * src/cli/create-character.ts 中 GENERAL_ATTR_HINTS 对齐。
 */
export interface GeneralRosterEntry {
  id: string;
  name: string;
  /** 列表展示用，与 CLI 一致 */
  attrHint: string;
}

const ATTR_OVERRIDES: Record<string, string> = {
  关羽: '武力 97，忠义 100',
  张飞: '武力 98，忠义 100',
  赵云: '武力 96，忠义 95',
  夏侯惇: '武力 92，忠义 100',
  孙坚: '武力 95，统率 93',
};

const RAW_ORDER: { id: string; name: string }[] = [
  { id: 'lv-bu', name: '吕布' },
  { id: 'dong-zhuo', name: '董卓' },
  { id: 'liu-bei', name: '刘备' },
  { id: 'guan-yu', name: '关羽' },
  { id: 'zhang-fei', name: '张飞' },
  { id: 'cao-cao', name: '曹操' },
  { id: 'yuan-shao', name: '袁绍' },
  { id: 'sun-jian', name: '孙坚' },
  { id: 'gongsun-zan', name: '公孙瓒' },
  { id: 'kong-rong', name: '孔融' },
  { id: 'xiahou-dun', name: '夏侯惇' },
  { id: 'dian-wei', name: '典韦' },
  { id: 'cao-ren', name: '曹仁' },
  { id: 'hua-xiong', name: '华雄' },
  { id: 'zhao-yun', name: '赵云' },
  { id: 'ma-teng', name: '马腾' },
  { id: 'yuan-shu', name: '袁术' },
  { id: 'xiahou-yuan', name: '夏侯渊' },
  { id: 'cao-hong', name: '曹洪' },
];

export const HULAGUAN_GENERAL_ROSTER: GeneralRosterEntry[] = RAW_ORDER.map((row) => ({
  ...row,
  attrHint: ATTR_OVERRIDES[row.name] ?? '属性待补充',
}));
