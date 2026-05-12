/**
 * 与 scenarios/xuanwu-men/config.json 的 availableNpcs 顺序对齐。
 */
import type { GeneralRosterEntry } from './hulaguan-roster';

const ATTR_OVERRIDES: Record<string, string> = {
  李世民: '决断与驭下 97，骑射与胆略 96',
  李建成: '储贰威仪与结纳 93，戒惧秦王 深',
  李元吉: '悍勇与骑斗 94，性躁 88',
  尉迟敬德: '马槊与胆决 97，护主 99',
  长孙无忌: '密勿谋议 95，外戚纽带 深',
  房玄龄: '筹策与典章 96',
  杜如晦: '断事与机敏 95',
  高士廉: '稳重与宗戚援应 91',
  张公谨: '果敢与门禁行止 90',
  程知节: '勇悍护卫 93',
};

const RAW_ORDER: { id: string; name: string }[] = [
  { id: 'li-shi-min', name: '李世民' },
  { id: 'li-jian-cheng', name: '李建成' },
  { id: 'li-yuan-ji', name: '李元吉' },
  { id: 'yu-chi-jing-de', name: '尉迟敬德' },
  { id: 'chang-sun-wu-ji', name: '长孙无忌' },
  { id: 'fang-xuan-ling', name: '房玄龄' },
  { id: 'du-ru-hui', name: '杜如晦' },
  { id: 'gao-shi-lian', name: '高士廉' },
  { id: 'zhang-gong-jin', name: '张公谨' },
  { id: 'cheng-zhi-jie', name: '程知节' },
];

export const XUANWU_MEN_GENERAL_ROSTER: GeneralRosterEntry[] = RAW_ORDER.map((row) => ({
  ...row,
  attrHint: ATTR_OVERRIDES[row.name] ?? '唐初宫省与军政语境人物',
}));
