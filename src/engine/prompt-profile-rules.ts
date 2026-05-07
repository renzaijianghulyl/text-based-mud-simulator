import type { PromptProfile } from './prompt-builder';

export interface PromptProfileContext {
  relationship: number;
  round: number;
}

export interface PromptProfileRules {
  rich: {
    hardKeywords: string[];
    softKeywords: string[];
    minSoftScore: number;
    minIntentLength: number;
    minRelationship: number;
    minRound: number;
  };
  fast: {
    keywords: string[];
    maxIntentLength: number;
  };
  riskDenyFastKeywords: string[];
  defaultProfile: Exclude<PromptProfile, 'auto'>;
}

export const PROMPT_PROFILE_RULES: PromptProfileRules = {
  rich: {
    hardKeywords: [
      '决战',
      '生死',
      '决斗',
      '搏杀',
      '死战',
      '最后一战',
      '刺杀',
      '自杀',
      '牺牲',
      '死亡',
      '拼命',
      '同归于尽',
      '表白',
      '求婚',
      '结拜',
      '背叛',
      '效忠',
      '誓死',
      '生死与共',
      '恩断义绝',
      '投降',
      '归顺',
      '效命',
      '赴死',
      '赌上性命',
      '至死不渝',
      '矢志不渝',
    ],
    softKeywords: ['最终', '追随', '忠心', '忠诚'],
    minSoftScore: 2,
    minIntentLength: 8,
    minRelationship: 60,
    minRound: 10,
  },
  fast: {
    keywords: ['你好', '谢谢', '再见', '是什么', '在哪里', '是谁', '继续', '然后', '好的', '嗯', '哦', '哈哈', '呵呵'],
    maxIntentLength: 6,
  },
  riskDenyFastKeywords: ['决战', '生死', '刺杀', '背叛', '牺牲', '投降', '归顺', '赴死', '同归于尽', '效忠', '誓死'],
  defaultProfile: 'balanced',
};

