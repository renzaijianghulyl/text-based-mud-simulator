/**
 * 与 scenarios/shang-yang-bian-fa/config.json 的 availableNpcs 顺序对齐。
 */
import type { GeneralRosterEntry } from './hulaguan-roster';

const ATTR_OVERRIDES: Record<string, string> = {
  商鞅: '法度与辞锋 96，执行力 97',
  嬴渠梁: '决断与任贤 95，雪耻之志 深',
  甘龙: '宗法名分与廷辩 90，持重 92',
  杜挚: '旧法之辩 88，绵里藏针 85',
  嬴驷: '储贰气度 88，观局未发 86',
  景监: '察色通关节 87，谨慎 90',
  公子虔: '宗室骄悍 89，体面 82',
  公孙贾: '师道与礼法 87，克制 88',
};

const RAW_ORDER: { id: string; name: string }[] = [
  { id: 'shang-yang', name: '商鞅' },
  { id: 'qin-xiao-gong', name: '嬴渠梁' },
  { id: 'gan-long', name: '甘龙' },
  { id: 'du-zhi', name: '杜挚' },
  { id: 'ying-si', name: '嬴驷' },
  { id: 'jing-jian', name: '景监' },
  { id: 'gongzi-qian', name: '公子虔' },
  { id: 'gong-sun-jia', name: '公孙贾' },
];

export const SHANG_YANG_BIAN_FA_GENERAL_ROSTER: GeneralRosterEntry[] = RAW_ORDER.map((row) => ({
  ...row,
  attrHint: ATTR_OVERRIDES[row.name] ?? '战国秦廷与变法语境人物',
}));
