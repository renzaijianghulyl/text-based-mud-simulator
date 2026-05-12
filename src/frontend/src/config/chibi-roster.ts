/**
 * 与 scenarios/chibi/config.json 的 availableNpcs 顺序对齐。
 */
import type { GeneralRosterEntry } from './hulaguan-roster';

const ATTR_OVERRIDES: Record<string, string> = {
  周瑜: '水战与军略 96，统率 95',
  诸葛亮: '智谋 98，外交与天时 97',
  鲁肃: '战略与联刘 92，忠厚 95',
  孙权: '御下与决断 92',
  刘备: '仁德与凝聚 95',
  关羽: '武力 97，忠义 100',
  张飞: '武力 98，性烈 90',
  赵云: '武力 96，谨慎 95',
  黄盖: '水战老将 90，刚烈 92',
  甘宁: '水战与奇袭 94',
  曹操: '统率与谋略 98',
  程昱: '谋略与洞察 91',
  蒋干: '辩才 85（说客语境）',
  张辽: '武力 94，军纪 93',
};

const RAW_ORDER: { id: string; name: string }[] = [
  { id: 'zhou-yu', name: '周瑜' },
  { id: 'zhu-ge-liang', name: '诸葛亮' },
  { id: 'lu-su', name: '鲁肃' },
  { id: 'sun-quan', name: '孙权' },
  { id: 'liu-bei', name: '刘备' },
  { id: 'guan-yu', name: '关羽' },
  { id: 'zhang-fei', name: '张飞' },
  { id: 'zhao-yun', name: '赵云' },
  { id: 'huang-gai', name: '黄盖' },
  { id: 'gan-ning', name: '甘宁' },
  { id: 'cao-cao', name: '曹操' },
  { id: 'cheng-yu', name: '程昱' },
  { id: 'jiang-gan', name: '蒋干' },
  { id: 'zhang-liao', name: '张辽' },
];

export const CHIBI_GENERAL_ROSTER: GeneralRosterEntry[] = RAW_ORDER.map((row) => ({
  ...row,
  attrHint: ATTR_OVERRIDES[row.name] ?? '属性待补充',
}));
