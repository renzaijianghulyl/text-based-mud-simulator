import type { CurrentNpc } from '../types';

/** 云函数内无 scenarios 目录时的虎牢关 NPC 模板（与 scenarios/hulaguan/npcs/lv-bu.json 对齐）。 */
const LV_BU: CurrentNpc = {
  id: 'lv-bu',
  name: '吕布',
  title: '飞将',
  personality: '高傲、易怒、但爱才',
  motivation: '证明自己是天下第一猛将',
  speakingStyle: '简短、直接、自称"某家"',
  equipment: ['方天画戟', '兽面吞头连环铠'],
  mount: '赤兔马',
  redLines: ['被骂"三姓家奴"', '被刺杀', '被背叛', '被说怕死'],
  relationship: 0,
};

export function getHulaguanNpcTemplate(_requestedNpcId?: string): CurrentNpc {
  void _requestedNpcId;
  return { ...LV_BU };
}
