import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../engine/prompt-builder';
import { parseResponse } from '../engine/response-parser';
import { buildEnsembleBeatsHint } from '../engine/scenario-emotional-hint';
import { getScenarioEnsembleHint } from '../engine/scenario-ensemble-hint';
import {
  formatEliminatedNpcLabels,
  inferEliminatedNpcIdsFromScenes,
  mergeEliminatedNpcIds,
} from '../engine/eliminated-npcs';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';
import type { Session, StoryScene } from '../types';

function minimalSession(over: Partial<Session> = {}): Session {
  const base: Session = {
    _id: 'u_hulaguan',
    sessionId: 'u_hulaguan',
    userId: 'u',
    scenarioId: 'hulaguan',
    npcs: {
      current: {
        id: 'lv-bu',
        name: '吕布',
        personality: '高傲',
        motivation: '天下第一',
        relationship: 0,
      },
    },
    relationships: { 'lv-bu': 0 },
    player: { hp: 100, maxHp: 100 },
    recentSummaryLines: [],
    recentPhrases: [],
    keyEvents: [],
    cumulativeState: { totalRounds: 5, hp: 100, maxHp: 100 },
    history: [],
    currentRound: 2,
    intentQuotaGranted: 10,
    intentQuotaConsumed: 0,
    intentQuotaShareClaims: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
  ensureEliminatedNpcFields(base);
  return base;
}

describe('eliminatedNpcIds 与 prompt/群像', () => {
  it('parseResponse 解析可选 stateChanges.eliminatedNpcs', () => {
    const input = `{"scenes":[{"type":"narration","content":"华雄被斩于阵前。"},{"type":"dialogue","speaker":"袁绍","content":"传令。"}],"stateChanges":{"hp":0,"relationship":0,"eliminatedNpcs":["hua-xiong","hua-xiong"]}}`;
    const p = parseResponse(input);
    expect(p.stateChanges.eliminatedNpcs).toEqual(['hua-xiong']);
  });

  it('mergeEliminatedNpcIds 丢弃未知 id 并去重', () => {
    const s = minimalSession();
    mergeEliminatedNpcIds(s, ['hua-xiong', 'not-a-real-npc', 'hua-xiong']);
    expect(s.eliminatedNpcIds).toEqual(['hua-xiong']);
  });

  it('inferEliminatedNpcIdsFromScenes 在同幕含阵亡语义与正名时归纳 id', () => {
    const s = minimalSession();
    const scenes: StoryScene[] = [
      { type: 'narration', content: '刀光过处，华雄被斩于马下，三军哗然。' },
    ];
    expect(inferEliminatedNpcIdsFromScenes(s, scenes)).toContain('hua-xiong');
  });

  it('buildPrompt 注入本局已退场段落', () => {
    const prompt = buildPrompt(
      minimalSession().npcs,
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 3, hp: 100, maxHp: 100 },
        eliminatedNpcIds: ['hua-xiong'],
      },
      '继续观战',
      'hulaguan'
    );
    expect(prompt).toContain('【本局已退场角色');
    expect(prompt).toContain('hua-xiong');
    expect(prompt).toContain('华雄');
  });

  it('getScenarioEnsembleHint 剔除已退场 id 且主名单不再含华雄', () => {
    const hint = getScenarioEnsembleHint('hulaguan', ['hua-xiong']);
    expect(hint).toContain('已退场');
    expect(hint).toContain('hua-xiong');
    const pos = hint.indexOf('【本剧本可出现台词的 NPC】');
    expect(pos).toBeGreaterThan(-1);
    const rosterHead = hint.slice(pos, pos + 520);
    expect(rosterHead).not.toContain('华雄');
  });

  it('buildEnsembleBeatsHint R16 在 hua-xiong 已退场时参与 id 不含 hua-xiong', () => {
    const hint = buildEnsembleBeatsHint('hulaguan', 16, ['R15: 前锋接战'], ['hua-xiong']);
    expect(hint).toContain('孙坚破华雄');
    expect(hint).not.toContain('hua-xiong');
    expect(hint).toContain('sun-jian');
  });
});

describe('formatEliminatedNpcLabels', () => {
  it('输出 id 与正名', () => {
    const t = formatEliminatedNpcLabels('hulaguan', ['hua-xiong']);
    expect(t).toContain('hua-xiong');
    expect(t).toContain('华雄');
  });
});
