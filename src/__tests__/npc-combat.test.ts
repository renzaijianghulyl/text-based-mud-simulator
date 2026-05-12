import { describe, expect, it } from 'vitest';
import { parseResponse } from '../engine/response-parser';
import { initNpcCombatForSession, applyNpcHpDeltas, formatNpcCombatPromptSection } from '../engine/npc-combat';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';
import type { Session, StateChanges } from '../types';

function baseSession(): Session {
  const s: Session = {
    _id: 'u_h',
    sessionId: 'u_h',
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
    cumulativeState: { totalRounds: 1, hp: 100, maxHp: 100 },
    history: [],
    currentRound: 1,
    intentQuotaGranted: 10,
    intentQuotaConsumed: 0,
    intentQuotaShareClaims: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  ensureEliminatedNpcFields(s);
  initNpcCombatForSession(s);
  return s;
}

describe('npcCombat 本会话副本', () => {
  it('parseResponse 解析可选 npcHp', () => {
    const raw = `{"scenes":[{"type":"narration","content":"画戟一沉，吕布踉跄。"}],"stateChanges":{"hp":-5,"relationship":0,"npcHp":[{"id":"lv-bu","delta":-20}]}}`;
    const p = parseResponse(raw);
    expect(p.stateChanges.npcHp).toEqual([{ id: 'lv-bu', delta: -20 }]);
  });

  it('initNpcCombatForSession 为虎牢关卡司写入 hp/maxHp', () => {
    const s = baseSession();
    expect(s.npcCombatById?.['lv-bu']).toBeDefined();
    expect(s.npcCombatById!['lv-bu'].maxHp).toBeGreaterThan(0);
    expect(s.npcCombatById!['lv-bu'].hp).toBe(s.npcCombatById!['lv-bu'].maxHp);
  });

  it('applyNpcHpDeltas 合并并 clamp；hp≤0 时写入 eliminated', () => {
    const s = baseSession();
    s.npcCombatById!['lv-bu'] = { hp: 25, maxHp: 100 };
    const ch: StateChanges = { hp: 0, relationship: 0, npcHp: [{ id: 'lv-bu', delta: -80 }] };
    applyNpcHpDeltas(s, ch);
    expect(s.npcCombatById!['lv-bu'].hp).toBe(0);
    expect(s.eliminatedNpcIds).toContain('lv-bu');
  });

  it('formatNpcCombatPromptSection 含 lv-bu 与数值', () => {
    const s = baseSession();
    const t = formatNpcCombatPromptSection('hulaguan', s.npcCombatById, 2000);
    expect(t).toContain('lv-bu');
    expect(t).toContain('吕布');
  });
});
